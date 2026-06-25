import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import JournalEntry from '@/lib/models/JournalEntry';
import { getMonthlyEntryCount } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    await dbConnect();

    if (req.method === 'GET') {
      const {
        search = '',
        tier = '',
        status = '',
        page = '1',
        limit = '20',
        sort = 'createdAt',
        order = 'desc',
      } = req.query as Record<string, string>;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const filter: Record<string, any> = {};
      if (search) {
        filter.$or = [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
        ];
      }
      if (tier) filter.subscriptionTier = tier;
      if (status) filter.subscriptionStatus = status;

      const sortObj: Record<string, 1 | -1> = { [sort]: order === 'asc' ? 1 : -1 };

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('email name role companyName subscriptionTier subscriptionStatus currentPeriodEnd createdAt updatedAt totpEnabled')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        User.countDocuments(filter),
      ]);

      // Get entry usage for each user (current month)
      const userIds = users.map((u: any) => u._id.toString());
      const entryCounts = await Promise.all(
        userIds.map(async (uid) => {
          try {
            return await getMonthlyEntryCount(uid);
          } catch {
            return 0;
          }
        }),
      );

      const enrichedUsers = users.map((u: any, i: number) => ({
        id: u._id.toString(),
        email: u.email,
        name: u.name,
        role: u.role,
        companyName: u.companyName,
        subscriptionTier: u.subscriptionTier || 'free',
        subscriptionStatus: u.subscriptionStatus || 'free',
        currentPeriodEnd: u.currentPeriodEnd,
        entryUsage: entryCounts[i],
        totpEnabled: u.totpEnabled || false,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));

      return res.status(200).json({
        users: enrichedUsers,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    // DELETE - soft delete a user (move to trash)
    if (req.method === 'DELETE') {
      const { userId } = req.query as { userId: string };
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const user = await User.findById(userId).lean();
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Don't allow deleting other superadmins
      if ((user as any).role === 'superadmin') {
        return res.status(403).json({ error: 'Cannot delete superadmin users' });
      }

      const { trashItem } = await import('@/lib/audit');
      await trashItem({
        userId: 'admin',
        resource: 'user',
        resourceId: userId,
        label: `Deleted user: ${(user as any).email}`,
        snapshot: {
          email: (user as any).email,
          name: (user as any).name,
          role: (user as any).role,
          subscriptionTier: (user as any).subscriptionTier,
          subscriptionStatus: (user as any).subscriptionStatus,
        },
      });

      // Soft-delete: mark as deleted but keep in DB
      await User.findByIdAndUpdate(userId, {
        email: `deleted_${Date.now()}_${(user as any).email}`,
        name: '[Deleted User]',
        role: 'viewer',
      });

      const { logAction } = await import('@/lib/audit');
      await logAction({
        userId: 'admin',
        action: 'admin.user.delete',
        resource: 'user',
        resourceId: userId,
        details: { email: (user as any).email },
      });

      return res.status(200).json({ success: true });
    }
  } catch (error) {
    console.error('Admin users API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
