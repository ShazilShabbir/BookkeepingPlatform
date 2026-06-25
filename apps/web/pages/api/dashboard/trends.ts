import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import { resolveUserIdFromQuery } from '@/lib/customerContext';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = await resolveUserIdFromQuery(token, req);

  await dbConnect();

  try {
    const { startDate: sdParam, endDate: edParam, months } = req.query;
    let dateFilter: Record<string, any> = {};
    if (sdParam || edParam) {
      if (sdParam) dateFilter.$gte = sdParam;
      if (edParam) dateFilter.$lte = edParam;
    } else {
      const monthsBack = parseInt((months as string) || '12');
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      dateFilter.$gte = startDate.toISOString().slice(0, 10);
    }

    const entries = await JournalEntry.find({
      userId: uid,
      date: dateFilter,
    }).select('_id date').lean();

    const entryIds = entries.map(e => (e as any)._id.toString());
    const lines = await JournalLine.find({ journalEntryId: { $in: entryIds }, userId: uid }).lean();
    const accountDocs = await Account.find({ userId: uid, isActive: true }).lean();
    const accountMap = new Map<string, string>();
    for (const a of accountDocs) accountMap.set(a.code, a.type);

    const monthlyData = new Map<string, { revenue: number; expenses: number; profit: number }>();

    for (const entry of entries) {
      const month = (entry as any).date?.slice(0, 7);
      if (!month) continue;
      if (!monthlyData.has(month)) monthlyData.set(month, { revenue: 0, expenses: 0, profit: 0 });
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

    const result = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        profit: Math.round((data.revenue - data.expenses) * 100) / 100,
      }));

    return res.status(200).json({ success: true, data: result });
  } catch (e: any) {
    console.error('dashboard trends error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
