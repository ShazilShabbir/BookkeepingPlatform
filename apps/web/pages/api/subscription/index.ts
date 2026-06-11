import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import JournalEntry from '@/lib/models/JournalEntry';
import { TIERS, Tier, getEntryLimit } from '@/lib/tiers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  try {
    const user = await User.findById(uid).select('subscriptionTier subscriptionStatus currentPeriodEnd stripeCustomerId createdAt').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tier = ((user as any).subscriptionTier || 'free') as Tier;
    const status = (user as any).subscriptionStatus || 'free';
    const effectiveTier = status === 'active' || status === 'trialing' ? tier : 'free';
    const config = TIERS[effectiveTier];
    const limit = getEntryLimit(effectiveTier);

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const used = await JournalEntry.countDocuments({ userId: uid, date: { $gte: monthStart } });

    const allTiers = Object.entries(TIERS).map(([key, val]) => ({
      id: key,
      label: val.label,
      priceMonthly: val.priceMonthly,
      priceYearly: val.priceYearly,
      entryLimit: val.entryLimit,
      maxUsers: val.maxUsers,
      features: val.features,
    }));

    return res.status(200).json({
      success: true,
      data: {
        tier: effectiveTier,
        label: config.label,
        status,
        stripeCustomerId: (user as any).stripeCustomerId,
        currentPeriodEnd: (user as any).currentPeriodEnd,
        limits: { entryLimit: limit === -1 ? 'Unlimited' : limit, maxUsers: config.maxUsers },
        usage: { entryCount: used },
        createdAt: (user as any).createdAt,
        allTiers,
      },
    });
  } catch (e: any) {
    console.error('subscription error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
