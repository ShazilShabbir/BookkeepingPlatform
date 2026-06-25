import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongoose';
import SupportTicket from '@/lib/models/SupportTicket';
import User from '@/lib/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    await dbConnect();

    if (req.method === 'GET') {
      const { status = '', page = '1', limit = '50' } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const filter: Record<string, any> = {};
      if (status) filter.status = status;

      const [tickets, total] = await Promise.all([
        SupportTicket.find(filter)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        SupportTicket.countDocuments(filter),
      ]);

      // Resolve user emails for each ticket
      const userIds = [...new Set(tickets.map((t: any) => t.userId))];
      const users = await User.find({ _id: { $in: userIds } }).select('email name').lean();
      const userMap: Record<string, { email: string; name: string }> = {};
      users.forEach((u: any) => { userMap[u._id.toString()] = { email: u.email, name: u.name }; });

      return res.status(200).json({
        tickets: tickets.map((t: any) => ({
          id: t._id.toString(),
          userId: t.userId,
          userEmail: userMap[t.userId]?.email || 'Unknown',
          userName: userMap[t.userId]?.name || 'Unknown',
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          messageCount: t.messages?.length || 0,
          lastMessage: t.messages?.length > 0 ? t.messages[t.messages.length - 1]?.body?.substring(0, 100) : '',
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    if (req.method === 'PATCH') {
      const { ticketId, status, priority } = req.body || {};
      if (!ticketId) {
        return res.status(400).json({ error: 'ticketId is required' });
      }

      const updates: Record<string, any> = {};
      if (status) updates.status = status;
      if (priority) updates.priority = priority;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'status or priority is required' });
      }

      const ticket = await SupportTicket.findByIdAndUpdate(ticketId, updates, { new: true }).lean();
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const { logAction } = await import('@/lib/audit');
      await logAction({
        userId: 'admin',
        action: 'admin.ticket.update',
        resource: 'support-ticket',
        resourceId: ticketId,
        details: updates,
      });

      return res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('Admin tickets API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
