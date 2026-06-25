import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // Clear the impersonation cookie
  res.setHeader('Set-Cookie', 'impersonate_token=; Path=/; Max-Age=0; SameSite=Lax');
  return res.status(200).json({ success: true });
}
