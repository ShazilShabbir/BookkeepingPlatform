import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  try {
    const { startDate, endDate } = req.query;
    const query: Record<string, any> = { userId: uid };
    if (startDate) query.date = { $gte: startDate as string };
    if (endDate) query.date = { ...query.date, $lte: endDate as string };

    const entries = await JournalEntry.find(query).select('_id').lean();
    const entryIds = entries.map(e => e._id.toString());

    const lines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid }).lean();
    const accountDocs = await Account.find({ userId: uid, isActive: true }).lean();
    const accountMap = new Map<string, { name: string; type: string }>();
    for (const a of accountDocs) accountMap.set(a.code, { name: a.name, type: a.type });

    const linesByEntry = new Map<string, any[]>();
    for (const line of lines) {
      const existing = linesByEntry.get(line.journalEntryId) || [];
      existing.push(line);
      linesByEntry.set(line.journalEntryId, existing);
    }

    const operating: any[] = [], investing: any[] = [], financing: any[] = [];
    let totOp = 0, totInv = 0, totFin = 0;

    for (const eid of entryIds) {
      const entryLines = linesByEntry.get(eid) || [];
      const cashLine = entryLines.find(l => l.accountCode === '1000');
      if (!cashLine) continue;
      for (const line of entryLines.filter(l => l.accountCode !== '1000')) {
        const info = accountMap.get(line.accountCode);
        if (!info) continue;
        const side = cashLine.debit > 0 ? 'debit' : 'credit';
        const amount = Math.round((side === 'debit' ? (line.credit || 0) : -(line.debit || 0)) * 100) / 100;
        if (Math.abs(amount) < 0.01) continue;
        const item = { accountCode: line.accountCode, accountName: info.name, amount };
        const code = parseInt(line.accountCode);
        if (info.type === 'revenue' || info.type === 'expense') { operating.push(item); totOp += amount; }
        else if (code >= 1400 && code < 2000) { investing.push(item); totInv += amount; }
        else { financing.push(item); totFin += amount; }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        sections: [
          { title: 'Operating Activities', items: operating, total: Math.round(totOp * 100) / 100 },
          { title: 'Investing Activities', items: investing, total: Math.round(totInv * 100) / 100 },
          { title: 'Financing Activities', items: financing, total: Math.round(totFin * 100) / 100 },
        ],
        totalChange: Math.round((totOp + totInv + totFin) * 100) / 100,
      },
    });
  } catch (e: any) {
    console.error('cash-flow error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
