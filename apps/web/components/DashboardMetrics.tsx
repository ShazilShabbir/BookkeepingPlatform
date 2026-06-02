import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { DashboardMetrics as DashboardMetricsType } from 'bookkeeping-shared';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const entriesRef = collection(db, 'ledger_entries');
        const q = query(entriesRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);

        let totalIncome = 0;
        let totalExpenses = 0;
        const categoryStats: Record<string, { amount: number; count: number }> = {};

        snapshot.forEach((doc) => {
          const entry = doc.data();
          if (entry.type === 'income') {
            totalIncome += entry.amount;
          } else {
            totalExpenses += Math.abs(entry.amount);
          }

          if (!categoryStats[entry.category]) {
            categoryStats[entry.category] = { amount: 0, count: 0 };
          }
          categoryStats[entry.category].amount += entry.amount;
          categoryStats[entry.category].count += 1;
        });

        const netProfit = totalIncome - totalExpenses;
        const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

        setMetrics({
          totalRevenue: totalIncome,
          totalExpenses,
          netProfit,
          profitMargin,
          entryCount: snapshot.size,
          topCategories: Object.entries(categoryStats)
            .map(([category, data]) => ({
              category,
              amount: data.amount,
              count: data.count,
              percentage: (data.amount / totalIncome) * 100,
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5),
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
        <svg className="w-12 h-12 text-surface-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-surface-500">No data available yet. Import a CSV to get started.</p>
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

  return (
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
  );
}
