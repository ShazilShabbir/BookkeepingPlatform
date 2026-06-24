import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Card, Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import Head from 'next/head';

interface TierInfo {
  id: string;
  label: string;
  priceMonthly: number;
  priceYearly: number;
  entryLimit: number | string;
  maxUsers: number;
  features: Record<string, boolean>;
}

interface SubscriptionData {
  tier: string;
  label: string;
  status: string;
  stripeCustomerId: string;
  currentPeriodEnd: string | null;
  limits: { entryLimit: number | string; maxUsers: number };
  usage: { entryCount: number };
  createdAt: string;
  allTiers: TierInfo[];
}

export default function BillingPage() {
  const router = useRouter();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription');
      const json = await res.json();
      if (json.success) setData(json.data);
      else toast.error(json.error || 'Failed to load');
    } catch {
      toast.error('Failed to load billing info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/create-portal', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.url) window.location.href = json.url;
      else toast.error(json.error || 'Failed to open billing portal');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <p className="text-surface-500">Could not load billing information.</p>
      </div>
    );
  }

  const usagePercent = data.limits.entryLimit === 'Unlimited' ? 0 : Math.round((data.usage.entryCount / (data.limits.entryLimit as number)) * 100);
  const isPaid = data.tier !== 'free';

  return (
    <>
      <Head>
        <title>Billing | BookKeep</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen bg-surface-50 py-10">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Billing & Plan</h1>
          <p className="mt-1 text-surface-500">Manage your subscription and usage.</p>
        </div>

        {/* Current Plan */}
        <Card padding="lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-semibold text-surface-900">Current Plan</h2>
                <Badge className={isPaid ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600'}>
                  {data.label}
                </Badge>
                {data.status === 'past_due' && (
                  <Badge className="bg-red-100 text-red-700">Past Due</Badge>
                )}
              </div>
              <p className="text-sm text-surface-500">
                {isPaid
                  ? `Your plan renews ${data.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleDateString() : '—'}`
                  : 'You are on the Free plan. Upgrade to unlock more features.'}
              </p>
            </div>
            <div className="flex gap-3">
              {!isPaid && (
                <Button onClick={() => router.push('/pricing')} className="bg-primary-600 hover:bg-primary-700 text-white">
                  Upgrade
                </Button>
              )}
              {isPaid && (
                <Button onClick={handleManageBilling} loading={portalLoading} variant="secondary">
                  Manage Billing
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Usage */}
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">Monthly Usage</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-surface-600">Journal Entries</span>
                <span className="font-medium text-surface-900">
                  {data.usage.entryCount.toLocaleString()} / {data.limits.entryLimit === 'Unlimited' ? 'Unlimited' : (data.limits.entryLimit as number).toLocaleString()}
                </span>
              </div>
              {data.limits.entryLimit !== 'Unlimited' && (
                <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-primary-500'}`}
                    style={{ width: `${Math.min(100, usagePercent)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Compare Plans */}
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-surface-900 mb-6">Compare Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th scope="col" className="text-left py-3 pr-4 font-medium text-surface-500">Feature</th>
                  {data.allTiers.map((t) => (
                    <th scope="col" key={t.id} className={`text-center py-3 px-4 font-semibold ${t.id === data.tier ? 'text-primary-700' : 'text-surface-700'}`}>
                      {t.label}
                      {t.id === data.tier && <span className="block text-xs text-primary-500 font-normal">Current</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-surface-100">
                  <td className="py-3 pr-4 text-surface-700">Price</td>
                  {data.allTiers.map((t) => (
                    <td key={t.id} className="text-center py-3 px-4 font-medium text-surface-900">
                      {t.priceMonthly === 0 ? 'Free' : `$${t.priceMonthly}/mo`}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-surface-100">
                  <td className="py-3 pr-4 text-surface-700">Entries / month</td>
                  {data.allTiers.map((t) => (
                    <td key={t.id} className="text-center py-3 px-4 text-surface-700">{t.entryLimit === -1 ? 'Unlimited' : t.entryLimit.toLocaleString()}</td>
                  ))}
                </tr>
                <tr className="border-b border-surface-100">
                  <td className="py-3 pr-4 text-surface-700">Users</td>
                  {data.allTiers.map((t) => (
                    <td key={t.id} className="text-center py-3 px-4 text-surface-700">{t.maxUsers}</td>
                  ))}
                </tr>
                {Object.entries(data.allTiers[0]?.features || {}).map(([key]) => {
                  const label = key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  return (
                    <tr key={key} className="border-b border-surface-100">
                      <td className="py-3 pr-4 text-surface-700">{label}</td>
                      {data.allTiers.map((t) => {
                        const included = t.features[key];
                        return (
                          <td key={t.id} className="text-center py-3 px-4">
                            {included ? (
                              <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-surface-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
    </>
  );
}

export function getServerSideProps() {
  return { props: {} };
}
