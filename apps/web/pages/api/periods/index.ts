import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import ClosedPeriod from '@/lib/models/ClosedPeriod';
import { resolveUserIdFromQuery } from '@/lib/customerContext';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = await resolveUserIdFromQuery(token, req);

  await dbConnect();

  if (req.method === 'GET') {
    const periods = await ClosedPeriod.find({ userId: uid }).sort({ yearMonth: -1 }).lean();
    return res.status(200).json({ success: true, data: periods });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
