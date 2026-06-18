import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { verifyTOTP } from '@/lib/totp';
import * as crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { token: totpToken } = req.body;
  if (!totpToken) return res.status(400).json({ error: 'TOTP token is required' });

  await dbConnect();
  const user = await User.findById(token.sub).select('totpSecret totpEnabled').lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const u = user as any;

  if (u.totpEnabled) {
    return res.status(400).json({ error: '2FA is already enabled' });
  }

  if (!u.totpSecret) {
    return res.status(400).json({ error: 'No TOTP secret found. Call /api/2fa/setup first.' });
  }

  if (!verifyTOTP(totpToken, u.totpSecret)) {
    return res.status(400).json({ error: 'Invalid TOTP code. Please try again.' });
  }

  const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));

  await User.findByIdAndUpdate(token.sub, {
    totpEnabled: true,
    totpBackupCodes: backupCodes,
  });

  return res.status(200).json({ success: true, backupCodes });
}
