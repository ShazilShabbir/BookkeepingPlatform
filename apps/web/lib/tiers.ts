export type Tier = 'free' | 'pro' | 'business';
export type Feature = 'ai-classify' | 'excel-export' | 'share-links' | 'email-reports' | 'cash-flow' | 'trial-balance' | 'period-close' | 'customer-management' | 'multi-user' | 'custom-branding' | 'priority-support';

export interface TierConfig {
  label: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  entryLimit: number;
  features: Record<Feature, boolean>;
  maxUsers: number;
}

export const TIERS: Record<Tier, TierConfig> = {
  free: {
    label: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
    entryLimit: 50,
    maxUsers: 1,
    features: {
      'ai-classify': false,
      'excel-export': false,
      'share-links': false,
      'email-reports': false,
      'cash-flow': false,
      'trial-balance': false,
      'period-close': false,
      'customer-management': false,
      'multi-user': false,
      'custom-branding': false,
      'priority-support': false,
    },
  },
  pro: {
    label: 'Pro',
    priceMonthly: 10,
    priceYearly: 100,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY || '',
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY || '',
    entryLimit: 1000,
    maxUsers: 1,
    features: {
      'ai-classify': true,
      'excel-export': true,
      'share-links': true,
      'email-reports': true,
      'cash-flow': true,
      'trial-balance': true,
      'period-close': true,
      'customer-management': true,
      'multi-user': false,
      'custom-branding': false,
      'priority-support': false,
    },
  },
  business: {
    label: 'Business',
    priceMonthly: 25,
    priceYearly: 250,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BUSINESS_MONTHLY || '',
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BUSINESS_YEARLY || '',
    entryLimit: -1, // unlimited
    maxUsers: 5,
    features: {
      'ai-classify': true,
      'excel-export': true,
      'share-links': true,
      'email-reports': true,
      'cash-flow': true,
      'trial-balance': true,
      'period-close': true,
      'customer-management': true,
      'multi-user': true,
      'custom-branding': true,
      'priority-support': true,
    },
  },
};

export const FEATURE_LABELS: Record<Feature, string> = {
  'ai-classify': 'AI-Powered Classification',
  'excel-export': 'Excel Report Export',
  'share-links': 'Shareable Report Links',
  'email-reports': 'Email Report Scheduling',
  'cash-flow': 'Cash Flow Statement',
  'trial-balance': 'Trial Balance Report',
  'period-close': 'Period Closing',
  'customer-management': 'Customer Management',
  'multi-user': 'Multi-User Access',
  'custom-branding': 'Custom Branding',
  'priority-support': 'Priority Support',
};

export function getTier(tier: string): TierConfig {
  return TIERS[tier as Tier] || TIERS.free;
}

export function getEntryLimit(tier: Tier): number {
  return TIERS[tier].entryLimit;
}

export function hasFeature(tier: Tier, feature: Feature): boolean {
  return TIERS[tier].features[feature] === true;
}
