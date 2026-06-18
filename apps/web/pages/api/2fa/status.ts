import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  await dbConnect();
  const user = await User.findById(token.sub).select('totpEnabled').lean();
  if (!user) return res.status(404).json({ error: 'User not found' });

  return res.status(200).json({ enabled: (user as any).totpEnabled || false });
}
