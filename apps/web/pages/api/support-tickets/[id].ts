import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import SupportTicket from '@/lib/models/SupportTicket';
import { requireAuth, checkCsrf } from '@/lib/auth';
import { resolveUserIdFromQuery } from '@/lib/customerContext';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ((req.method === 'POST' || req.method === 'PATCH' || req.method === 'DELETE') && !checkCsrf(req, res)) return;
  const token = await requireAuth(req, res);
  if (!token) return;
  const uid = await resolveUserIdFromQuery(token, req);
  const { id } = req.query;
  await dbConnect();

  const ticket = await SupportTicket.findOne({ _id: id, userId: uid });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, data: ticket.toObject() });
  }

  if (req.method === 'PATCH') {
    const { status, priority } = req.body;
    if (status) {
      if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      ticket.status = status;
    }
    if (priority) {
      if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority' });
      }
      ticket.priority = priority;
    }
    await ticket.save();
    return res.status(200).json({ success: true, data: ticket.toObject() });
  }

  if (req.method === 'POST') {
    const { body } = req.body;
    if (!body) return res.status(400).json({ error: 'Message body is required' });

    if (ticket.status === 'closed') return res.status(400).json({ error: 'Cannot reply to a closed ticket' });

    ticket.messages.push({
      senderId: uid,
      senderName: token.name || 'User',
      body,
      createdAt: new Date(),
    });
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      ticket.status = 'open';
    }
    await ticket.save();
    return res.status(200).json({ success: true, data: ticket.toObject() });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
