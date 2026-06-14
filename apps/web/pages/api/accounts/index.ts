import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import Account from '@/lib/models/Account';
import { logAction } from '@/lib/audit';
import { requireAuth, requireRole, checkCsrf } from '@/lib/auth';
import { resolveUserIdFromQuery } from '@/lib/customerContext';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST' && !checkCsrf(req, res)) return;

    const token = await requireAuth(req, res);
    if (!token) return;
    const uid = await resolveUserIdFromQuery(token, req);

    await dbConnect();

    if (req.method === 'GET') {
      const accounts = await Account.find({ userId: uid, isActive: true }).sort({ code: 1 }).lean();
      return res.status(200).json({ success: true, data: accounts });
    }

    if (req.method === 'POST') {
      if (!requireRole(token, 'admin')) {
        return res.status(403).json({ error: 'Only admins can create accounts' });
      }
      const { code, name, type, normalBalance } = req.body;
      if (!code || !name || !type) return res.status(400).json({ error: 'code, name, and type are required' });

      const existing = await Account.findOne({ userId: uid, code });
      if (existing) return res.status(409).json({ error: 'Account code already exists' });

      const normalizedType = type.toLowerCase();
      const normalizedBalance = normalBalance ? normalBalance.toLowerCase() : 'debit';

      const account = await Account.create({
        userId: uid,
        code,
        name,
        type: normalizedType,
        normalBalance: normalizedBalance,
        isActive: true,
      });
      await logAction({ userId: uid, action: 'create', resource: 'account', resourceId: code, details: { name, type: normalizedType }, req });
      return res.status(201).json({ success: true, data: account.toObject() });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[accounts] error:', {
      name: e?.name,
      message: e?.message,
      code: e?.code,
      stack: e?.stack?.split('\n').slice(0, 6).join('\n'),
    });
    const isDev = process.env.NODE_ENV === 'development';
    const msg = isDev ? (e?.message || e?.code || 'Internal server error') : 'Internal server error';
    return res.status(500).json({ error: msg });
  }
}
