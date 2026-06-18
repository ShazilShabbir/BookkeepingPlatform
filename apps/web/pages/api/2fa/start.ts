import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { checkLoginRateLimit } from '@/lib/rateLimit';
import * as crypto from 'crypto';

const PREAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me';

function signPreAuthToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 5 * 60 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', PREAUTH_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.headers['x-real-ip'] as string
    || 'unknown';
  const { allowed } = checkLoginRateLimit(ip);
  if (!allowed) return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });

  await dbConnect();
  const user = await User.findOne({ email: email.toLowerCase() }).select('password totpEnabled name role').lean();
  if (!user) return res.status(200).json({ needsTotp: false });

  const u = user as any;
  const valid = await bcrypt.compare(password, u.password);
  if (!valid) return res.status(200).json({ needsTotp: false });

  if (!u.totpEnabled) {
    return res.status(200).json({ needsTotp: false });
  }

  const preAuthToken = signPreAuthToken({ sub: u._id.toString(), email: email.toLowerCase() });

  return res.status(200).json({ needsTotp: true, preAuthToken });
}
