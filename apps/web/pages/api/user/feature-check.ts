import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { checkFeatureAccess } from '@/lib/subscription';
import type { Feature } from '@/lib/tiers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub as string;

  const { feature } = req.body;
  if (!feature) return res.status(400).json({ error: 'feature required' });

  const { allowed } = await checkFeatureAccess(uid, feature as Feature);
  return res.status(200).json({ allowed });
}
