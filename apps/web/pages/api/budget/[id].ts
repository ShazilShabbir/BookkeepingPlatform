import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import Budget from '@/lib/models/Budget';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub as string;

  await dbConnect();

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required' });

    if (req.method === 'PUT') {
      const { amount } = req.body;
      if (amount == null) return res.status(400).json({ error: 'amount required' });

      const budget = await Budget.findOneAndUpdate(
        { _id: id, userId: uid },
        { amount: Math.max(0, amount) },
        { new: true },
      ).lean();

      if (!budget) return res.status(404).json({ error: 'Budget not found' });

      return res.status(200).json({ success: true, data: { _id: (budget as any)._id.toString(), accountCode: budget.accountCode, month: budget.month, amount: budget.amount, currency: budget.currency || 'USD' } });
    }

    if (req.method === 'DELETE') {
      const result = await Budget.findOneAndDelete({ _id: id, userId: uid });
      if (!result) return res.status(404).json({ error: 'Budget not found' });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('budget detail error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
