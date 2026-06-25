import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import JournalEntry from '@/lib/models/JournalEntry';
import SupportTicket from '@/lib/models/SupportTicket';
import { TIERS } from '@/lib/tiers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    await dbConnect();

    // User counts by tier and status
    const [totalUsers, tierCounts, statusCounts, recentSignups] = await Promise.all([
      User.countDocuments(),
      User.aggregate([
        { $group: { _id: { $ifNull: ['$subscriptionTier', 'free'] }, count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $group: { _id: { $ifNull: ['$subscriptionStatus', 'free'] }, count: { $sum: 1 } } },
      ]),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const byTier: Record<string, number> = { free: 0, pro: 0, business: 0 };
    tierCounts.forEach((t: any) => { byTier[t._id] = t.count; });

    const byStatus: Record<string, number> = { active: 0, trialing: 0, past_due: 0, canceled: 0, free: 0 };
    statusCounts.forEach((s: any) => { byStatus[s._id] = s.count; });

    // MRR = (active pro × $5) + (active business × $10)
    const activePro = await User.countDocuments({ subscriptionTier: 'pro', subscriptionStatus: { $in: ['active', 'trialing'] } });
    const activeBusiness = await User.countDocuments({ subscriptionTier: 'business', subscriptionStatus: { $in: ['active', 'trialing'] } });
    const mrr = activePro * TIERS.pro.priceMonthly + activeBusiness * TIERS.business.priceMonthly;

    // Churn rate (canceled in last 30d / active at start of period)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const [canceledLast30d, activeAtStart] = await Promise.all([
      User.countDocuments({ subscriptionStatus: 'canceled', updatedAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ subscriptionStatus: { $in: ['active', 'trialing'] }, createdAt: { $lte: thirtyDaysAgo } }),
    ]);
    const churnRate = activeAtStart > 0 ? Math.round((canceledLast30d / activeAtStart) * 1000) / 10 : 0;

    // Entries this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const entriesThisMonth = await JournalEntry.countDocuments({ createdAt: { $gte: startOfMonth } });

    // Open tickets
    const openTickets = await SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } }).catch(() => 0);

    // Signups over time (last 12 months)
    const signupsOverTime = await User.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    // Tier distribution
    const tierDistribution = [
      { name: 'Free', value: byTier.free || 0, color: '#64748b' },
      { name: 'Pro', value: byTier.pro || 0, color: '#6366f1' },
      { name: 'Business', value: byTier.business || 0, color: '#f59e0b' },
    ];

    return res.status(200).json({
      totalUsers,
      recentSignups,
      byTier,
      byStatus,
      mrr,
      churnRate,
      entriesThisMonth,
      openTickets,
      signupsOverTime: signupsOverTime.map((s: any) => ({ month: s._id, count: s.count })),
      tierDistribution,
      activeSubscriptions: byStatus.active + byStatus.trialing,
      pastDue: byStatus.past_due,
      canceled30d: canceledLast30d,
    });
  } catch (error) {
    console.error('Admin stats API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
