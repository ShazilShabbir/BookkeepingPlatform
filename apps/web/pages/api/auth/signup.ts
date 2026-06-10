import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, password, companyName } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  try {
    await dbConnect();

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
    return res.status(500).json({ error: e?.message || 'Internal server error' });
  }
}
