import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Head from 'next/head';

type Interval = 'month' | 'year';

const tiers = [
  {
    id: 'free',
    label: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    description: 'For getting started with basic bookkeeping.',
    popular: false,
    features: [
      { name: '50 journal entries / month', included: true },
      { name: 'Basic Dashboard (P&L, Balance Sheet)', included: true },
      { name: 'CSV Import', included: true },
      { name: 'Chart of Accounts', included: true },
      { name: 'AI-Powered Classification', included: false },
      { name: 'Bank Reconciliation', included: false },
      { name: 'Invoice Creation', included: false },
      { name: 'Excel Report Export', included: false },
      { name: 'Shareable Report Links', included: false },
      { name: 'Team Members', included: false },
    ],
  },
  {
    id: 'pro',
    label: 'Pro',
    priceMonthly: 5,
    priceYearly: 57,
    description: 'For growing businesses that need full financial insights.',
    popular: true,
    features: [
      { name: '1,000 journal entries / month', included: true },
      { name: 'All Reports (P&L, Balance Sheet, Cash Flow, Trial Balance)', included: true },
      { name: 'CSV Import & AI Classification', included: true },
      { name: 'Bank Reconciliation', included: true },
      { name: 'Invoice Creation', included: true },
      { name: 'Excel Report Export', included: true },
      { name: 'Shareable Report Links', included: true },
      { name: 'Email Report Scheduling', included: true },
      { name: 'Period Closing', included: true },
      { name: 'Customer Management', included: true },
      { name: 'Multi-Currency Support', included: true },
      { name: '1 user seat', included: true },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    priceMonthly: 10,
    priceYearly: 114,
    description: 'For teams with advanced needs and priority support.',
    popular: false,
    features: [
      { name: 'Unlimited journal entries', included: true },
      { name: 'Everything in Pro', included: true },
      { name: 'Up to 5 team members', included: true },
      { name: 'Custom Branding on Reports', included: true },
      { name: 'Multi-Currency Support', included: true },
      { name: 'Priority Support', included: true },
    ],
  },
];

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 text-surface-300 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [interval, setInterval] = useState<Interval>('month');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSubscribe = async (tierId: string) => {
    if (!session) {
      router.push('/login');
      return;
    }
    if (tierId === 'free') {
      router.push('/dashboard');
      return;
    }
    setLoadingId(tierId);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId, interval }),
      });
      const json = await res.json();
      if (json.success && json.url) {
        window.location.href = json.url;
      } else {
        toast.error(json.error || 'Failed to create checkout');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Pricing | BookKeep</title>
        <meta name="description" content="Simple, transparent pricing for businesses of all sizes. Free plan available. No hidden fees, cancel anytime." />
        <meta property="og:title" content="Pricing — BookKeep" />
        <meta property="og:description" content="Simple, transparent pricing for businesses of all sizes." />
      </Head>
      <div className="min-h-screen bg-surface-50">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-surface-900 tracking-tight">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-surface-500">Choose the plan that fits your business. Upgrade or downgrade anytime.</p>
          <div className="mt-8 inline-flex items-center bg-white border border-surface-200 rounded-xl p-1 shadow-sm">
            <button onClick={() => setInterval('month')} className={clsx('px-5 py-2.5 text-sm font-medium rounded-lg transition-colors', interval === 'month' ? 'bg-surface-900 text-white shadow-sm' : 'text-surface-600 hover:text-surface-900')}>Monthly</button>
            <button onClick={() => setInterval('year')} className={clsx('px-5 py-2.5 text-sm font-medium rounded-lg transition-colors items-center inline-flex gap-2', interval === 'year' ? 'bg-surface-900 text-white shadow-sm' : 'text-surface-600 hover:text-surface-900')}>Yearly <span className="text-[11px] font-bold text-white bg-emerald-500 px-1.5 py-0.5 rounded-full">Save 5%</span></button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => {
            const price = interval === 'month' ? tier.priceMonthly : tier.priceYearly;
            const savings = interval === 'year' && tier.priceMonthly > 0 ? tier.priceMonthly * 12 - tier.priceYearly : 0;
            return (
              <div key={tier.id} className={clsx(
                'relative rounded-2xl border p-8 flex flex-col transition-all duration-300 bg-white',
                tier.popular
                  ? 'border-primary-500/40 shadow-xl shadow-primary-500/10 ring-1 ring-primary-500/20 md:scale-[1.03]'
                  : 'border-surface-200 shadow-sm hover:shadow-md hover:-translate-y-0.5',
              )}>
                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-surface-900 text-white text-xs font-semibold rounded-full shadow-lg whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-surface-900">{tier.label}</h2>
                  <p className="mt-1 text-sm text-surface-500 leading-relaxed">{tier.description}</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-surface-900 tracking-tight">${price}</span>
                    <span className="text-base text-surface-400">/{interval === 'month' ? 'mo' : 'yr'}</span>
                  </div>
                  {tier.id === 'free' && <p className="mt-1 text-sm text-surface-400">Always free</p>}
                  {savings > 0 && (
                    <p className="mt-1 text-sm text-emerald-600 font-medium">Save ${savings} per year</p>
                  )}
                </div>
                <Button
                  onClick={() => handleSubscribe(tier.id)}
                  loading={loadingId === tier.id}
                  className={clsx(
                    'w-full mb-8',
                    tier.popular
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 hover:from-primary-400 hover:to-primary-500'
                      : tier.id === 'free'
                        ? 'bg-surface-100 hover:bg-surface-200 text-surface-700'
                        : 'bg-white border-2 border-surface-300 hover:border-surface-400 text-surface-700',
                  )}
                >
                  {tier.id === 'free' ? 'Get Started' : session ? 'Subscribe' : 'Sign in to Subscribe'}
                </Button>
                <ul className="space-y-3 flex-1">
                  {tier.features.map((f) => (
                    <li key={f.name} className="flex items-start gap-3 text-sm">
                      {f.included ? <CheckIcon /> : <XIcon />}
                      <span className={f.included ? 'text-surface-700' : 'text-surface-400'}>{f.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}

export function getServerSideProps() {
  return { props: {} };
}
