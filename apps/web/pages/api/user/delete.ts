import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft-delete: prefix email and name
    const deletedEmail = `deleted_${Date.now()}@deleted.invalid`;
    user.email = deletedEmail;
    user.name = '[Deleted User]';
    user.password = ''; // Clear password
    user.totpSecret = undefined;
    user.totpEnabled = false;
    user.totpBackupCodes = undefined;
    user.stripeCustomerId = '';
    user.subscriptionTier = 'free';
    user.subscriptionStatus = 'canceled';
    user.subscriptionId = '';
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
