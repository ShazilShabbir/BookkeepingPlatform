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
    const accountTotals = new Map<string, { debits: number; credits: number }>();
    for (const line of lines) {
      const code = line.accountCode;
      if (!code) continue;
      const totals = accountTotals.get(code) || { debits: 0, credits: 0 };
      totals.debits += line.debit || 0;
      totals.credits += line.credit || 0;
      accountTotals.set(code, totals);
    }

    const accountDocs = await Account.find({ userId: uid, isActive: true }).lean();
    const accountMap = new Map<string, { name: string; type: string; normalBalance: string }>();
    for (const a of accountDocs) accountMap.set(a.code, { name: a.name, type: a.type, normalBalance: a.normalBalance || 'debit' });

    const rows: any[] = [];
    let totalDebits = 0, totalCredits = 0;
    for (const [code, totals] of accountTotals) {
      const info = accountMap.get(code);
      if (!info) continue;
      const normalBalance = info.normalBalance === 'credit' ? 'credit' : 'debit';
      const netBalance = normalBalance === 'credit' ? totals.credits - totals.debits : totals.debits - totals.credits;
      rows.push({ accountCode: code, accountName: info.name, accountType: info.type, normalBalance, totalDebits: totals.debits, totalCredits: totals.credits, netBalance });
      totalDebits += totals.debits;
      totalCredits += totals.credits;
    }
    rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    return res.status(200).json({
      success: true,
      data: {
        rows,
        totals: {
          totalDebits: Math.round(totalDebits * 100) / 100,
          totalCredits: Math.round(totalCredits * 100) / 100,
          difference: Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100,
          balanced: Math.abs(totalDebits - totalCredits) < 0.01,
        },
      },
    });
  } catch (e: any) {
    console.error('trial-balance error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
