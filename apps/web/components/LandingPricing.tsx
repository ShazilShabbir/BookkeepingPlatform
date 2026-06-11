import { useState } from 'react';
import { Button } from '@/components/ui';
import clsx from 'clsx';

const plans = [
  {
    name: 'Free',
    monthlyPrice: '$0',
    yearlyPrice: '$0',
    period: '/month',
    description: 'Perfect for freelancers just getting started.',
    features: [
      { included: true, text: 'Up to 50 entries per month' },
      { included: true, text: 'Basic reports' },
      { included: true, text: 'CSV import' },
      { included: false, text: 'AI-powered classification' },
      { included: false, text: 'Bank reconciliation' },
      { included: false, text: 'Team members' },
    ],
    cta: 'Get started',
    href: '/signup',
    featured: false,
  },
  {
    name: 'Pro',
    monthlyPrice: '$19',
    yearlyPrice: '$15',
    period: '/month',
    description: 'Ideal for small teams and growing businesses.',
    features: [
      { included: true, text: 'Up to 1,000 entries per month' },
      { included: true, text: 'Advanced reports & dashboards' },
      { included: true, text: 'CSV import' },
      { included: true, text: 'AI-powered classification' },
      { included: true, text: 'Bank reconciliation' },
      { included: true, text: 'Up to 5 team members' },
    ],
    cta: 'Start free trial',
    href: '/signup',
    featured: true,
  },
  {
    name: 'Business',
    monthlyPrice: '$49',
    yearlyPrice: '$39',
    period: '/month',
    description: 'For organizations with advanced needs.',
    features: [
      { included: true, text: 'Unlimited entries' },
      { included: true, text: 'All reports & exports' },
      { included: true, text: 'Priority support' },
      { included: true, text: 'AI-powered classification' },
      { included: true, text: 'Bank reconciliation' },
      { included: true, text: 'Unlimited team members' },
    ],
    cta: 'Contact sales',
    href: '/signup',
    featured: false,
  },
];

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
                'px-4 py-2 text-sm font-medium rounded-full transition-all duration-200',
                !yearly ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700',
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 inline-flex items-center gap-2',
                yearly ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700',
              )}
            >
              Yearly
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">Save 20%</span>
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
                  ? 'border-primary-500/40 bg-white shadow-xl shadow-primary-500/10 md:scale-105'
                  : 'border-surface-200 bg-white shadow-card hover:shadow-card-hover',
              )}
            >
              {plan.featured && (
                <>
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary-400/20 via-primary-500/10 to-transparent pointer-events-none" />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-semibold rounded-full shadow-lg shadow-primary-500/30">
                    Most Popular
                  </div>
                </>
              )}

              <div className="mb-6 relative">
                <h3 className="text-lg font-semibold text-surface-900">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-surface-900">
                    {yearly && plan.yearlyPrice ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-sm text-surface-400">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-surface-500">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1 relative">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-sm">
                    {f.included ? (
                      <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-surface-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={f.included ? 'text-surface-700' : 'text-surface-400'}>{f.text}</span>
                  </li>
                ))}
              </ul>

              <a href={plan.href} className="relative">
                <Button
                  className={clsx(
                    'w-full transition-all duration-300',
                    plan.featured
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:from-primary-400 hover:to-primary-500 hover:shadow-primary-500/50'
                      : 'bg-surface-100 hover:bg-surface-200 text-surface-900',
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
