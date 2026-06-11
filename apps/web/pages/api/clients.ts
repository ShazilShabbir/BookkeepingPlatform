import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import Client from '@/lib/models/Client';
import { checkFeatureAccess } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  if (req.method === 'POST') {
    const { allowed } = await checkFeatureAccess(uid!, 'share-links');
    if (!allowed) return res.status(403).json({ error: 'Adding clients requires Pro plan or higher. Visit /pricing to upgrade.', code: 'UPGRADE_REQUIRED' });
  }

  if (req.method === 'GET') {
    const clients = await Client.find({ userId: uid }).sort({ name: 1 }).lean();
    return res.status(200).json({ success: true, data: clients });
  }

  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const { randomBytes } = await import('crypto');
    const accessToken = randomBytes(32).toString('hex');

    const client = await Client.create({
      userId: uid,
      name,
      accessToken,
    });
    return res.status(201).json({ success: true, data: client.toObject() });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
