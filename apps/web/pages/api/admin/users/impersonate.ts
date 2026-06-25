import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, signAdminToken } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';

const IMPERSONATION_SECRET = process.env.ADMIN_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-admin-secret';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { userId } = req.body || {};
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    await dbConnect();
    const user = await User.findById(userId).select('email name role').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = user as any;

    // Create a short-lived impersonation token (5 minutes)
    const now = Date.now();
    const exp = now + 5 * 60 * 1000;
    const body = {
      sub: u._id.toString(),
      email: u.email,
      name: u.name,
      role: u.role || 'admin',
      adminOf: u._id.toString(),
      type: 'impersonation',
      iat: now,
      exp,
    };

    // Sign with the admin secret
    const crypto = await import('crypto');
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const bodyEncoded = Buffer.from(JSON.stringify(body)).toString('base64url');
    const sig = crypto.createHmac('sha256', IMPERSONATION_SECRET).update(`${header}.${bodyEncoded}`).digest('base64url');
    const token = `${header}.${bodyEncoded}.${sig}`;

    // Log the impersonation
    const { logAction } = await import('@/lib/audit');
    await logAction({
      userId: admin.role === 'superadmin' ? 'admin' : 'admin',
      action: 'admin.impersonate',
      resource: 'user',
      resourceId: u._id.toString(),
      details: { targetEmail: u.email, targetName: u.name },
      req,
    });

    return res.status(200).json({
      success: true,
      token,
      user: { email: u.email, name: u.name, role: u.role },
      expiresIn: 300,
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    return res.status(500).json({ error: 'Failed to create impersonation session' });
  }
}
