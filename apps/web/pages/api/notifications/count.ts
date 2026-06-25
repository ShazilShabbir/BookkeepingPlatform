import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongoose';
import Notification from '@/lib/models/Notification';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await dbConnect();

    const count = await Notification.countDocuments({
      userId: session.user.email,
      read: false,
    });

    return res.status(200).json({ count });
  } catch (error) {
    console.error('Notification count error:', error);
    return res.status(500).json({ count: 0 });
  }
}
