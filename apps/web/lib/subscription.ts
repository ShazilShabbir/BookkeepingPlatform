import dbConnect from './mongoose';
import User from './models/User';
import JournalEntry from './models/JournalEntry';
import { Tier, Feature, getEntryLimit, hasFeature, getTier, TIERS } from './tiers';

// In-memory cache for feature overrides (TTL: 30 seconds)
let overrideCache: { data: Record<string, string>; timestamp: number } | null = null;
const OVERRIDE_CACHE_TTL = 30 * 1000;

async function getOverrides(): Promise<Record<string, string>> {
  if (overrideCache && Date.now() - overrideCache.timestamp < OVERRIDE_CACHE_TTL) {
    return overrideCache.data;
  }
  try {
    const FeatureOverride = (await import('./models/FeatureOverride')).default;
    await dbConnect();
    const overrides = await FeatureOverride.find().lean();
    const map: Record<string, string> = {};
    overrides.forEach((o: any) => { map[o.feature] = o.override; });
    overrideCache = { data: map, timestamp: Date.now() };
    return map;
  } catch {
    return {};
  }
}

export function clearOverrideCache() {
  overrideCache = null;
}

export async function getUserTier(uid: string): Promise<{ tier: Tier; status: string }> {
  await dbConnect();
  const user = await User.findById(uid).select('subscriptionTier subscriptionStatus').lean();
  if (!user) return { tier: 'free', status: 'free' };
  const tier = (user as any).subscriptionTier || 'free';
  const status = (user as any).subscriptionStatus || 'free';
  if (status === 'active' || status === 'trialing') return { tier: tier as Tier, status };
  return { tier: 'free', status: 'free' };
}

export async function checkFeatureAccess(uid: string, feature: Feature): Promise<{ allowed: boolean; tier: Tier }> {
  // Check for admin overrides first
  const overrides = await getOverrides();
  const override = overrides[feature];
  if (override === 'enabled') return { allowed: true, tier: 'business' };
  if (override === 'disabled') return { allowed: false, tier: 'free' };

  // Default: use tier-based logic
  const { tier } = await getUserTier(uid);
  return { allowed: hasFeature(tier, feature), tier };
}

export async function getMonthlyEntryCount(uid: string): Promise<number> {
  await dbConnect();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  return JournalEntry.countDocuments({
    userId: uid,
    date: { $gte: monthStart },
  });
}

export async function checkEntryLimit(uid: string): Promise<{ allowed: boolean; limit: number; used: number }> {
  const { tier } = await getUserTier(uid);
  const limit = getEntryLimit(tier);
  if (limit === -1) return { allowed: true, limit: -1, used: 0 };
  const used = await getMonthlyEntryCount(uid);
  return { allowed: used < limit, limit, used };
}

export async function requireFeature(uid: string, feature: Feature): Promise<void> {
  const { allowed, tier } = await checkFeatureAccess(uid, feature);
  if (!allowed) {
    const config = getTier(tier);
    const neededTier = feature === 'ai-classify' || feature === 'excel-export' || feature === 'share-links' || feature === 'email-reports' || feature === 'cash-flow' || feature === 'trial-balance' || feature === 'period-close' || feature === 'customer-management' || feature === 'invoicing' || feature === 'bank-reconciliation' || feature === 'multi-currency' ? 'Pro' : 'Business';
    const err: any = new Error(`This feature requires ${neededTier} plan or higher.`);
    err.statusCode = 403;
    err.code = 'FEATURE_NOT_ALLOWED';
    err.upgradeUrl = '/pricing';
    throw err;
  }
}

export function getUsagePercentage(used: number, limit: number): number {
  if (limit === -1) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export async function isMaintenanceMode(): Promise<boolean> {
  const overrides = await getOverrides();
  return overrides['__maintenance'] === 'enabled';
}
