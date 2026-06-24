import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import Budget from '@/lib/models/Budget';
import Account from '@/lib/models/Account';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub as string;

  await dbConnect();

  try {
    if (req.method === 'GET') {
      const { month, accountCode } = req.query;
      if (!month || typeof month !== 'string') return res.status(400).json({ error: 'month query param required (YYYY-MM)' });

      const filter: Record<string, any> = { userId: uid, month };
      if (accountCode) filter.accountCode = accountCode;

      const budgets = await Budget.find(filter).lean();
      const accounts = await Account.find({ userId: uid, isActive: true }).select('code name').lean();
      const accountNameMap = new Map(accounts.map(a => [a.code, a.name]));

      const data = budgets.map(b => ({
        _id: (b as any)._id.toString(),
        accountCode: b.accountCode,
        accountName: accountNameMap.get(b.accountCode) || b.accountCode,
        month: b.month,
        amount: b.amount,
      }));

      return res.status(200).json({ success: true, data });
    }

    if (req.method === 'POST') {
      const { accountCode, month, amount } = req.body;
      if (!accountCode || !month || amount == null) return res.status(400).json({ error: 'accountCode, month, amount required' });

      const budget = await Budget.findOneAndUpdate(
        { userId: uid, accountCode, month },
        { userId: uid, accountCode, month, amount: Math.max(0, amount) },
        { upsert: true, new: true },
      ).lean();

      return res.status(200).json({ success: true, data: { _id: (budget as any)._id.toString(), accountCode: budget.accountCode, month: budget.month, amount: budget.amount } });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('budget error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
