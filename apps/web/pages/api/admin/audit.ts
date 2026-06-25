import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongoose';
import AuditLog from '@/lib/models/AuditLog';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    await dbConnect();

    const {
      action = '',
      userId = '',
      startDate = '',
      endDate = '',
      page = '1',
      limit = '50',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      logs: logs.map((l: any) => ({
        id: l._id.toString(),
        userId: l.userId,
        action: l.action,
        resource: l.resource,
        resourceId: l.resourceId,
        details: l.details,
        ip: l.ip,
        userAgent: l.userAgent,
        createdAt: l.createdAt,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Admin audit API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
