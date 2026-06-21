import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import Account from '@/lib/models/Account';
import { logAction } from '@/lib/audit';
import { requireAuth, requireRole, checkCsrf } from '@/lib/auth';
import { resolveUserIdFromQuery } from '@/lib/customerContext';
import { checkFeatureAccess } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'PUT' && !checkCsrf(req, res)) return;

    const token = await requireAuth(req, res);
    if (!token) return;
    const uid = await resolveUserIdFromQuery(token, req);

    await dbConnect();

    const { code } = req.query;
    if (!code || Array.isArray(code)) return res.status(400).json({ error: 'Invalid account code' });

    if (req.method === 'GET') {
      const account = await Account.findOne({ userId: uid, code }).lean();
      if (!account) return res.status(404).json({ error: 'Account not found' });
      return res.status(200).json({ success: true, data: account });
    }

    if (req.method === 'PUT') {
      if (!requireRole(token, 'admin')) {
        return res.status(403).json({ error: 'Only admins can update accounts' });
      }
      const { name, type, normalBalance, isActive, currency } = req.body;
      const update: Record<string, any> = { updatedAt: new Date() };
      if (name !== undefined) update.name = name;
      if (type !== undefined) update.type = type.toLowerCase();
      if (normalBalance !== undefined) update.normalBalance = normalBalance.toLowerCase();
      if (isActive !== undefined) update.isActive = isActive;
      if (currency !== undefined) {
        const ccy = currency.toUpperCase();
        if (ccy !== 'USD') {
          const { allowed } = await checkFeatureAccess(uid, 'multi-currency');
          if (!allowed) return res.status(403).json({ error: 'Multi-currency requires Pro plan or higher.', code: 'UPGRADE_REQUIRED' });
        }
        update.currency = ccy;
      }

      const account = await Account.findOneAndUpdate(
        { userId: uid, code },
        { $set: update },
        { new: true }
      ).lean();
      if (!account) return res.status(404).json({ error: 'Account not found' });
      await logAction({ userId: uid, action: 'update', resource: 'account', resourceId: code, details: update, req });
      return res.status(200).json({ success: true, data: account });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[accounts/code] error:', {
      name: e?.name,
      message: e?.message,
      code: e?.code,
    });
    const isDev = process.env.NODE_ENV === 'development';
    const msg = isDev ? (e?.message || e?.code || 'Internal server error') : 'Internal server error';
    return res.status(500).json({ error: msg });
  }
}
