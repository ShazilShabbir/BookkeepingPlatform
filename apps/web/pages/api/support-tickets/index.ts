import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import SupportTicket from '@/lib/models/SupportTicket';
import { requireAuth, checkCsrf } from '@/lib/auth';
import { resolveUserIdFromQuery } from '@/lib/customerContext';
import { checkFeatureAccess } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ((req.method === 'POST') && !checkCsrf(req, res)) return;
  const token = await requireAuth(req, res);
  if (!token) return;
  const uid = await resolveUserIdFromQuery(token, req);
  await dbConnect();

  if (req.method === 'GET') {
    const { status, page = '1', limit = '50' } = req.query;
    const filter: Record<string, any> = { userId: uid };
    if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(status as string)) {
      filter.status = status;
    }
    const pg = Math.max(1, parseInt(page as string, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pg - 1) * lim;

    const [data, total] = await Promise.all([
      SupportTicket.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(lim).lean(),
      SupportTicket.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, data, total, page: pg, pages: Math.ceil(total / lim) });
  }

  if (req.method === 'POST') {
    const { allowed } = await checkFeatureAccess(uid!, 'priority-support');
    if (!allowed) return res.status(403).json({ error: 'Priority support requires Business plan', upgradeUrl: '/pricing' });

    const { subject, body, priority = 'normal' } = req.body;
    if (!subject || !body) return res.status(400).json({ error: 'Subject and body are required' });

    const ticket = await SupportTicket.create({
      userId: uid,
      subject,
      priority,
      messages: [{ senderId: uid, senderName: token.name || 'User', body }],
    });

    return res.status(201).json({ success: true, data: ticket.toObject() });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
