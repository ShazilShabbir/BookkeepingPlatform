import { useState } from 'react';
import { Button } from '@/components/ui';
import clsx from 'clsx';

const plans = [
  {
    name: 'Free',
    monthlyPrice: '$0',
    yearlyPrice: '$0',
    period: '/month',
    description: 'Perfect for freelancers getting started.',
    features: [
      { included: true, text: '50 entries per month' },
      { included: true, text: 'Basic reports (P&L, Balance Sheet)' },
      { included: true, text: 'CSV import' },
      { included: false, text: 'AI-powered classification' },
      { included: false, text: 'Bank reconciliation' },
      { included: false, text: 'Invoice creation' },
      { included: false, text: 'Team members' },
    ],
    cta: 'Get started',
    href: '/signup',
    featured: false,
  },
  {
    name: 'Pro',
    monthlyPrice: '$5',
    yearlyPrice: '$57',
    period: '/month',
    yearlyLabel: '/year',
    description: 'For growing businesses that need full financial insights.',
    features: [
      { included: true, text: '1,000 entries per month' },
      { included: true, text: 'P&L, Balance Sheet, Cash Flow, Trial Balance' },
      { included: true, text: 'CSV import & AI classification' },
      { included: true, text: 'Bank reconciliation' },
      { included: true, text: 'Invoice creation' },
      { included: true, text: 'Excel export & shareable links' },
      { included: true, text: 'Email report scheduling' },
      { included: true, text: 'Period closing' },
      { included: true, text: 'Customer management' },
      { included: true, text: 'Multi-currency support' },
      { included: true, text: '1 user seat' },
    ],
    cta: 'Start free trial',
    href: '/signup',
    featured: true,
  },
  {
    name: 'Business',
    monthlyPrice: '$10',
    yearlyPrice: '$114',
    period: '/month',
    yearlyLabel: '/year',
    description: 'For teams with advanced needs and priority support.',
    features: [
      { included: true, text: 'Unlimited entries' },
      { included: true, text: 'Everything in Pro' },
      { included: true, text: 'Up to 5 team members' },
      { included: true, text: 'Custom branding on reports' },
      { included: true, text: 'Multi-currency support' },
      { included: true, text: 'Priority support' },
    ],
    cta: 'Subscribe',
    href: '/signup',
    featured: false,
  },
];

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 text-surface-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function LandingPricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-surface-900 tracking-tight text-balance">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-surface-500">
            No hidden fees. Upgrade or cancel anytime.
          </p>

          <div className="mt-8 inline-flex items-center gap-3 bg-surface-100 rounded-full p-1">
            <button
              onClick={() => setYearly(false)}
              className={clsx(
                'px-5 py-2 text-sm font-medium rounded-full transition-all duration-200',
                !yearly ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700',
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={clsx(
                'px-5 py-2 text-sm font-medium rounded-full transition-all duration-200 inline-flex items-center gap-2',
                yearly ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700',
              )}
            >
              Yearly
              <span className="text-[11px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full">Save 5%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={clsx(
                'relative rounded-2xl border p-8 flex flex-col transition-all duration-300',
                plan.featured
                  ? 'border-primary-500/40 bg-white shadow-xl shadow-primary-500/10 md:scale-[1.03] ring-1 ring-primary-500/20'
                  : 'border-surface-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5',
              )}
            >
              {plan.featured && (
                <>
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary-400/15 via-primary-500/5 to-transparent pointer-events-none" />
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-surface-900 text-white text-xs font-semibold rounded-full shadow-lg">
                    Most Popular
                  </div>
                </>
              )}

              <div className="mb-6 relative">
                <h3 className="text-lg font-semibold text-surface-900">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-surface-900 tracking-tight">
                    {yearly && plan.yearlyPrice !== '$0' ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-base text-surface-400">
                    {yearly && plan.yearlyPrice !== '$0' ? plan.yearlyLabel : plan.period}
                  </span>
                </div>
                {yearly && plan.yearlyPrice !== '$0' && (
                  <p className="mt-1 text-sm text-emerald-600 font-medium">
                    ${parseInt(plan.monthlyPrice.replace('$', '')) * 12 - parseInt(plan.yearlyPrice.replace('$', ''))} savings per year
                  </p>
                )}
                {plan.yearlyPrice === '$0' && (
                  <p className="mt-1 text-sm text-surface-400">Always free</p>
                )}
                <p className="mt-2 text-sm text-surface-500 leading-relaxed">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1 relative">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-sm">
                    {f.included ? <CheckIcon /> : <XIcon />}
                    <span className={f.included ? 'text-surface-700' : 'text-surface-400'}>{f.text}</span>
                  </li>
                ))}
              </ul>

              <a href={plan.href} className="relative">
                <Button
                  className={clsx(
                    'w-full transition-all duration-300',
                    plan.featured
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 hover:from-primary-400 hover:to-primary-500 hover:shadow-primary-500/40'
                      : plan.name === 'Free'
                        ? 'bg-surface-100 hover:bg-surface-200 text-surface-700'
                        : 'bg-white border-2 border-surface-300 hover:border-surface-400 text-surface-700',
                  )}
                >
                  {plan.cta}
                </Button>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
