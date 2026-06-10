import { useEffect, useState } from 'react';
import type { DashboardMetrics as DashboardMetricsType } from '@/lib/types';
import { Card, MetricCardSkeleton } from '@/components/ui';

interface DashboardMetricsProps {
  userId: string;
}

const metricConfig = [
  {
    key: 'totalRevenue',
    label: 'Total Revenue',
    prefix: '$',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'totalExpenses',
    label: 'Total Expenses',
    prefix: '$',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 21.75h16.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'netProfit',
    label: 'Net Profit',
    prefix: '$',
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75l.75.75m0 0l.75-.75m-.75.75V21" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'profitMargin',
    label: 'Profit Margin',
    suffix: '%',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function AnimatedValue({ value, prefix = '', suffix = '', decimals = 2 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
}

export default function DashboardMetrics({ userId }: DashboardMetricsProps) {
  const [metrics, setMetrics] = useState<DashboardMetricsType | null>(null);
  const [accountTypeCount, setAccountTypeCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/dashboard/summary');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to fetch');
        const { kpis, profitLoss } = json.data;

        setAccountTypeCount(
          Object.fromEntries(
            (profitLoss.sections || []).map((s: any) => [s.type, s.accounts?.length || 0])
          )
        );

        setMetrics({
          totalRevenue: kpis.totalRevenue,
          totalExpenses: kpis.totalExpenses,
          netProfit: kpis.netProfit,
          profitMargin: kpis.profitMargin,
          entryCount: kpis.entryCount,
          topCategories: [],
          revenueByCategory: [],
          expensesByCategory: [],
          dailyMetrics: [],
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <MetricCardSkeleton key={i} />)}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card padding="lg" className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-surface-900 mb-2">Welcome to BookKeep</h2>
          <p className="text-surface-500 mb-8">Get started in 3 simple steps</p>
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
              <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold shrink-0">1</div>
              <div>
                <h3 className="font-semibold text-surface-900 text-sm">Import your first CSV</h3>
                <p className="text-sm text-surface-500 mt-1">Upload a bank statement or sales CSV. AI auto-detects columns and classifies transactions.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
              <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold shrink-0">2</div>
              <div>
                <h3 className="font-semibold text-surface-900 text-sm">Review & confirm</h3>
                <p className="text-sm text-surface-500 mt-1">Check auto-classified transactions, override accounts if needed, then confirm.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
              <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold shrink-0">3</div>
              <div>
                <h3 className="font-semibold text-surface-900 text-sm">View reports</h3>
                <p className="text-sm text-surface-500 mt-1">See your Profit & Loss and Balance Sheet instantly. Download beautiful Excel reports.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const getValue = (key: string) => {
    switch (key) {
      case 'totalRevenue': return metrics.totalRevenue;
      case 'totalExpenses': return metrics.totalExpenses;
      case 'netProfit': return metrics.netProfit;
      case 'profitMargin': return metrics.profitMargin;
      default: return 0;
    }
  };

  const TYPE_LABELS: Record<string, string> = {
    asset: 'Assets', liability: 'Liabilities', equity: 'Equity', revenue: 'Revenue', expense: 'Expenses',
  };
  const TYPE_COLORS: Record<string, string> = {
    asset: 'bg-blue-50 text-blue-700', liability: 'bg-amber-50 text-amber-700',
    equity: 'bg-purple-50 text-purple-700', revenue: 'bg-emerald-50 text-emerald-700', expense: 'bg-red-50 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricConfig.map((metric) => {
        const value = getValue(metric.key);
        const isProfit = metric.key === 'netProfit';
        const isMargin = metric.key === 'profitMargin';

        return (
          <Card key={metric.key} hover padding="md" className="animate-slide-up">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${metric.bgColor} ${metric.color}`}>
                {metric.icon}
              </div>
              {(isProfit || isMargin) && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                  value >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    {value >= 0 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                    )}
                  </svg>
                  {Math.abs(value).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-sm text-surface-500 mb-1">{metric.label}</p>
            <p className={`text-2xl font-bold ${metric.color}`}>
              <AnimatedValue
                value={value}
                prefix={metric.prefix}
                suffix={metric.suffix}
                decimals={isMargin ? 1 : 2}
              />
            </p>
          </Card>
        );
      })}
    </div>

    {Object.keys(accountTypeCount).length > 0 && (
      <div className="flex flex-wrap gap-2">
        {Object.entries(accountTypeCount).map(([type, count]) => (
          <span key={type} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${TYPE_COLORS[type] || 'bg-surface-100 text-surface-600'}`}>
            {TYPE_LABELS[type] || type}: {count}
          </span>
        ))}
      </div>
    )}
  </div>
  );
}
