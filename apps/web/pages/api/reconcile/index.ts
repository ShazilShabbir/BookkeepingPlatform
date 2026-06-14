import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import Reconciliation from '@/lib/models/Reconciliation';
import ReconciliationLine from '@/lib/models/ReconciliationLine';
import { resolveUserIdFromQuery } from '@/lib/customerContext';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = await resolveUserIdFromQuery(token, req);

  await dbConnect();

  try {
    if (req.method === 'GET') {
      const id = req.query.id as string;
      if (id) {
        const rec = await Reconciliation.findOne({ _id: id, userId: uid }).lean();
        if (!rec) return res.status(404).json({ error: 'Reconciliation not found' });
        const lines = await ReconciliationLine.find({ reconciliationId: id }).sort({ date: 1 }).lean();
        return res.status(200).json({ success: true, data: { ...rec, lines } });
      }

      const list = await Reconciliation.find({ userId: uid }).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: list });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('reconcile/index error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
