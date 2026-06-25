import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/adminAuth';
import dbConnect from '@/lib/mongoose';
import FeatureOverride from '@/lib/models/FeatureOverride';
import { Feature, FEATURE_LABELS } from '@/lib/tiers';

const ALL_FEATURES: Feature[] = [
  'ai-classify', 'excel-export', 'share-links', 'email-reports', 'cash-flow',
  'trial-balance', 'period-close', 'customer-management', 'multi-user',
  'custom-branding', 'priority-support', 'invoicing', 'bank-reconciliation',
  'multi-currency', 'custom-reports',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    await dbConnect();

    if (req.method === 'GET') {
      const overrides = await FeatureOverride.find().lean();
      const overrideMap: Record<string, string> = {};
      overrides.forEach((o: any) => { overrideMap[o.feature] = o.override; });

      const features = ALL_FEATURES.map((f) => ({
        feature: f,
        label: FEATURE_LABELS[f],
        override: overrideMap[f] || 'default',
      }));

      // Add maintenance mode as a special feature
      features.push({
        feature: '__maintenance' as Feature,
        label: 'Maintenance Mode',
        override: overrideMap['__maintenance'] || 'default',
      });

      return res.status(200).json({ features });
    }

    if (req.method === 'PUT') {
      const { feature, override } = req.body || {};
      if (!feature || !['enabled', 'disabled', 'default'].includes(override)) {
        return res.status(400).json({ error: 'feature and override (enabled|disabled|default) are required' });
      }

      if (override === 'default') {
        await FeatureOverride.deleteOne({ feature });
      } else {
        await FeatureOverride.findOneAndUpdate(
          { feature },
          { override, updatedBy: admin.role, updatedAt: new Date() },
          { upsert: true },
        );
      }

      const { logAction } = await import('@/lib/audit');
      await logAction({
        userId: 'admin',
        action: 'admin.feature.toggle',
        resource: 'feature',
        resourceId: feature,
        details: { feature, override },
      });

      // Clear the in-memory override cache so changes take effect immediately
      try {
        const { clearOverrideCache } = await import('@/lib/subscription');
        clearOverrideCache();
      } catch { /* cache clear is best-effort */ }

      return res.status(200).json({ success: true, feature, override });
    }
  } catch (error) {
    console.error('Admin features API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
