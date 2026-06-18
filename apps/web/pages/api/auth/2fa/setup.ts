import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { generateSecret, generateOTPAuthURL } from '@/lib/totp';

async function fetchQRDataURL(otpauth: string): Promise<string> {
  const url = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(otpauth)}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`Google Charts returned ${resp.status}`);
    const buf = await resp.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (e) {
    console.warn('QR fetch failed, will use client-side fallback:', e);
    return '';
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  await dbConnect();
  const user = await User.findById(token.sub).select('totpSecret totpEnabled email name').lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const u = user as any;

  if (u.totpEnabled) {
    return res.status(400).json({ error: '2FA is already enabled. Disable it first to regenerate a secret.' });
  }

  const secret = generateSecret();
  const otpauth = generateOTPAuthURL(secret, u.email);
  const qrDataUrl = await fetchQRDataURL(otpauth);

  await User.findByIdAndUpdate(token.sub, { totpSecret: secret });

  return res.status(200).json({ secret, otpauth, qrDataUrl, email: u.email });
}
