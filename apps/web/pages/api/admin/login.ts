import type { NextApiRequest, NextApiResponse } from 'next';
import { signAdminToken } from '@/lib/adminAuth';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ADMIN_SECRET) {
    return res.status(500).json({ error: 'Admin secret not configured' });
  }

  const { secret } = req.body || {};
  if (!secret || typeof secret !== 'string') {
    return res.status(400).json({ error: 'Secret is required' });
  }

  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signAdminToken({ role: 'superadmin', type: 'admin-session' });

  res.setHeader('Set-Cookie', `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${8 * 60 * 60}`);
  return res.status(200).json({ success: true });
}
