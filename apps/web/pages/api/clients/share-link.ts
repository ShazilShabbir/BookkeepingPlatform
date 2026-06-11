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

  const { allowed } = await checkFeatureAccess(uid!, 'share-links');
  if (!allowed) return res.status(403).json({ error: 'Share links requires Pro plan or higher. Visit /pricing to upgrade.', code: 'UPGRADE_REQUIRED' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let client = await Client.findOne({ userId: uid }).lean();

  if (!client) {
    const { randomBytes } = await import('crypto');
    const accessToken = randomBytes(32).toString('hex');
    client = await Client.create({
      userId: uid,
      name: 'Default Client',
      accessToken,
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      name: (client as any).name,
      accessToken: (client as any).accessToken,
    },
  });
}
