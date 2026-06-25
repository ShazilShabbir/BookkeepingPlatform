import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import { getMonthlyEntryCount } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { id } = req.query as { id: string };
  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    await dbConnect();

    if (req.method === 'GET') {
      const user = await User.findById(id)
        .select('-password -totpSecret -totpBackupCodes')
        .lean();
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const u = user as any;
      const [entryCount, lineCount] = await Promise.all([
        JournalEntry.countDocuments({ userId: id }),
        JournalLine.countDocuments({ userId: id }),
      ]);

      const monthlyUsage = await getMonthlyEntryCount(id);

      return res.status(200).json({
        user: {
          id: u._id.toString(),
          email: u.email,
          name: u.name,
          role: u.role,
          companyName: u.companyName,
          subscriptionTier: u.subscriptionTier || 'free',
          subscriptionStatus: u.subscriptionStatus || 'free',
          subscriptionId: u.subscriptionId,
          stripeCustomerId: u.stripeCustomerId,
          currentPeriodEnd: u.currentPeriodEnd,
          totpEnabled: u.totpEnabled || false,
          brandingLogo: u.brandingLogo,
          brandingPrimaryColor: u.brandingPrimaryColor,
          brandingCompanyName: u.brandingCompanyName,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        },
        stats: {
          totalEntries: entryCount,
          totalLines: lineCount,
          monthlyEntryUsage: monthlyUsage,
        },
      });
    }

    if (req.method === 'PATCH') {
      const body = req.body || {};
      const updates: Record<string, any> = {};

      // Allowed fields to update
      if (body.tier !== undefined) {
        if (!['free', 'pro', 'business'].includes(body.tier)) {
          return res.status(400).json({ error: 'Invalid tier value' });
        }
        updates.subscriptionTier = body.tier;
      }

      if (body.status !== undefined) {
        if (!['free', 'active', 'trialing', 'past_due', 'canceled'].includes(body.status)) {
          return res.status(400).json({ error: 'Invalid status value' });
        }
        updates.subscriptionStatus = body.status;
      }

      if (body.role !== undefined) {
        if (!['superadmin', 'admin', 'customer', 'client', 'viewer'].includes(body.role)) {
          return res.status(400).json({ error: 'Invalid role value' });
        }
        updates.role = body.role;
      }

      if (body.name !== undefined) updates.name = body.name;
      if (body.companyName !== undefined) updates.companyName = body.companyName;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const existing = await User.findById(id).lean();
      if (!existing) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updated = await User.findByIdAndUpdate(id, updates, { new: true })
        .select('-password -totpSecret -totpBackupCodes')
        .lean();

      const { logAction } = await import('@/lib/audit');
      await logAction({
        userId: 'admin',
        action: 'admin.user.update',
        resource: 'user',
        resourceId: id,
        details: { updates, previousTier: (existing as any).subscriptionTier, previousStatus: (existing as any).subscriptionStatus },
      });

      const u = updated as any;
      return res.status(200).json({
        user: {
          id: u._id.toString(),
          email: u.email,
          name: u.name,
          role: u.role,
          subscriptionTier: u.subscriptionTier,
          subscriptionStatus: u.subscriptionStatus,
        },
      });
    }
  } catch (error) {
    console.error('Admin user detail API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
