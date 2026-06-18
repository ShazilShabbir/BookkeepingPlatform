import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { verifyTOTP } from '@/lib/totp';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { token: totpToken, backupCode } = req.body;

  await dbConnect();
  const user = await User.findById(token.sub).select('totpSecret totpEnabled totpBackupCodes').lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const u = user as any;

  if (!u.totpEnabled) {
    return res.status(400).json({ error: '2FA is not enabled' });
  }

  let valid = false;

  if (totpToken && u.totpSecret) {
    valid = verifyTOTP(totpToken, u.totpSecret);
  }

  if (!valid && backupCode && u.totpBackupCodes) {
    const idx = u.totpBackupCodes.indexOf(backupCode);
    if (idx >= 0) {
      u.totpBackupCodes.splice(idx, 1);
      valid = true;
    }
  }

  if (!valid) {
    return res.status(400).json({ error: 'Invalid TOTP code or backup code' });
  }

  await User.findByIdAndUpdate(token.sub, {
    $unset: { totpSecret: '', totpBackupCodes: '' },
    totpEnabled: false,
  });

  return res.status(200).json({ success: true });
}
