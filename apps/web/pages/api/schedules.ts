import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import ReportSchedule from '@/lib/models/ReportSchedule';
import { checkFeatureAccess } from '@/lib/subscription';
import { logAction } from '@/lib/audit';
import { requireAuth, checkCsrf } from '@/lib/auth';
import { resolveUserIdFromQuery } from '@/lib/customerContext';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ((req.method === 'POST' || req.method === 'DELETE') && !checkCsrf(req, res)) return;

  const token = await requireAuth(req, res);
  if (!token) return;
  const uid = await resolveUserIdFromQuery(token, req);

  try {
    await dbConnect();
    if (req.method === 'GET') {
      const schedules = await ReportSchedule.find({ userId: uid }).sort({ nextRunAt: 1 }).lean();
      return res.status(200).json({ success: true, data: schedules });
    }

    if (req.method === 'POST') {
      const { allowed } = await checkFeatureAccess(uid!, 'email-reports');
      if (!allowed) return res.status(403).json({ error: 'Scheduled reports require Pro plan or higher. Visit /pricing to upgrade.', code: 'UPGRADE_REQUIRED' });

      const { clientId, frequency, reportType } = req.body;
      if (!clientId || !frequency) return res.status(400).json({ error: 'clientId and frequency are required' });

      if (!['weekly', 'monthly'].includes(frequency)) return res.status(400).json({ error: 'frequency must be weekly or monthly' });

      const nextRunAt = new Date();
      nextRunAt.setHours(8, 0, 0, 0);
      if (frequency === 'weekly') nextRunAt.setDate(nextRunAt.getDate() + 7);
      else nextRunAt.setMonth(nextRunAt.getMonth() + 1);

      const schedule = await ReportSchedule.create({
        userId: uid,
        clientId,
        frequency,
        reportType: reportType || 'financial',
        nextRunAt,
      });
      await logAction({ userId: uid, action: 'create', resource: 'schedule', resourceId: schedule._id.toString(), details: { clientId, frequency }, req });
      return res.status(201).json({ success: true, data: schedule.toObject() });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || Array.isArray(id)) return res.status(400).json({ error: 'id is required' });

      const schedule = await ReportSchedule.findOneAndDelete({ _id: id, userId: uid });
      if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
      await logAction({ userId: uid, action: 'delete', resource: 'schedule', resourceId: id, details: { clientId: (schedule as any).clientId, frequency: (schedule as any).frequency }, req });
      return res.status(200).json({ success: true });
    }
  } catch (e: any) {
    console.error('[schedules] error:', e?.message);
    return res.status(500).json({ error: e?.message || 'Internal server error' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
