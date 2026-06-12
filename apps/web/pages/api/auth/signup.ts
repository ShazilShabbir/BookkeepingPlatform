import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { signupSchema, safeParse } from '@/lib/validate';
import { checkSignupRateLimit } from '@/lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const { allowed, remaining, resetIn } = checkSignupRateLimit(ip);
  if (!allowed) {
    return res.status(429).json({ error: `Too many signup attempts. Try again in ${Math.ceil(resetIn / 60000)} minutes.` });
  }

  const parsed = safeParse(signupSchema, req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    await dbConnect();

    const { name, email, password, companyName } = parsed.data;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      companyName: companyName || '',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      data: { id: user._id.toString(), email: user.email, name: user.name, companyName: user.companyName },
    });
  } catch (e: any) {
    console.error('signup error:', e?.message || e);
    if (e?.code === 11000) return res.status(409).json({ error: 'Email already registered' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
