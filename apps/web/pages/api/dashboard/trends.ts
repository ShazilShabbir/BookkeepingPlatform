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
    const monthsBack = parseInt((req.query.months as string) || '12');
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);
    const startStr = startDate.toISOString().slice(0, 10);

    const entries = await JournalEntry.find({
      userId: uid,
      date: { $gte: startStr },
    }).select('_id date').lean();

    const entryIds = entries.map(e => (e as any)._id.toString());
    const lines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid }).lean();
    const accountDocs = await Account.find({ userId: uid, isActive: true }).lean();
    const accountMap = new Map<string, string>();
    for (const a of accountDocs) accountMap.set(a.code, a.type);

    const monthlyData = new Map<string, { revenue: number; expenses: number }>();

    for (const entry of entries) {
      const month = (entry as any).date?.slice(0, 7);
      if (!month) continue;
      if (!monthlyData.has(month)) monthlyData.set(month, { revenue: 0, expenses: 0 });
    }

    for (const line of lines) {
      const entry = entries.find(e => (e as any)._id.toString() === line.journalEntryId);
      if (!entry) continue;
      const month = (entry as any).date?.slice(0, 7);
      if (!month) continue;
      const acctType = accountMap.get(line.accountCode);
      if (!acctType || (acctType !== 'revenue' && acctType !== 'expense')) continue;

      const data = monthlyData.get(month)!;
      const net = (line.credit || 0) - (line.debit || 0);
      if (acctType === 'revenue') data.revenue += net;
      else data.expenses -= net;
    }

    const months = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
      }));

    return res.status(200).json({ success: true, data: months });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Internal server error' });
  }
}
