import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import ClosedPeriod from '@/lib/models/ClosedPeriod';
import { logAction } from '@/lib/audit';
import { requireAuth, requireRole, checkCsrf } from '@/lib/auth';
import { checkFeatureAccess } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkCsrf(req, res)) return;

  const token = await requireAuth(req, res);
  if (!token) return;
  if (!requireRole(token, 'admin')) {
    return res.status(403).json({ error: 'Only admins can manage periods' });
  }
  const uid = token.sub!;

  if (req.method === 'POST' || req.method === 'DELETE') {
    const { allowed } = await checkFeatureAccess(uid!, 'period-close');
    if (!allowed) return res.status(403).json({ error: 'Period closing requires Pro plan or higher. Visit /pricing to upgrade.', code: 'UPGRADE_REQUIRED' });
  }

  await dbConnect();

  const { yearMonth } = req.query;
  if (!yearMonth || Array.isArray(yearMonth)) return res.status(400).json({ error: 'Invalid yearMonth' });

  if (req.method === 'POST') {
    const existing = await ClosedPeriod.findOne({ userId: uid, yearMonth });
    if (existing) return res.status(409).json({ error: 'Period already closed' });

    await ClosedPeriod.create({
      userId: uid,
      yearMonth,
      closedAt: new Date(),
      closedBy: uid,
    });

    await logAction({ userId: uid, action: 'close', resource: 'period', resourceId: yearMonth, req });
    return res.status(200).json({ success: true, data: { yearMonth, closed: true } });
  }

  if (req.method === 'DELETE') {
    const result = await ClosedPeriod.findOneAndDelete({ userId: uid, yearMonth });
    if (!result) return res.status(404).json({ error: 'Period not found' });
    await logAction({ userId: uid, action: 'reopen', resource: 'period', resourceId: yearMonth, req });
    return res.status(200).json({ success: true, data: { yearMonth, closed: false } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
