import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import ClosedPeriod from '@/lib/models/ClosedPeriod';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  const { yearMonth } = req.query;
  if (!yearMonth || Array.isArray(yearMonth)) return res.status(400).json({ error: 'Invalid yearMonth' });

  if (req.method === 'POST') {
    const existing = await ClosedPeriod.findOne({ userId: uid, yearMonth });
    if (existing) return res.status(409).json({ error: 'Period already closed' });

    await ClosedPeriod.create({
      userId: uid,
      yearMonth,
      closedAt: new Date(),
      closedBy: uid,
    });

    return res.status(200).json({ success: true, data: { yearMonth, closed: true } });
  }

  if (req.method === 'DELETE') {
    const result = await ClosedPeriod.findOneAndDelete({ userId: uid, yearMonth });
    if (!result) return res.status(404).json({ error: 'Period not found' });
    return res.status(200).json({ success: true, data: { yearMonth, closed: false } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
