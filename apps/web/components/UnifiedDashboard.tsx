import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Button, CardGridSkeleton } from '@/components/ui';
import ShareButton from '@/components/ShareButton';
import RevenueChart from '@/components/RevenueChart';
import ExpenseChart from '@/components/ExpenseChart';
import QuickActions from '@/components/QuickActions';
import RecentActivity from '@/components/RecentActivity';
import Sparkline from '@/components/Sparkline';
import toast from 'react-hot-toast';

interface KPIs {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  entryCount: number;
}

interface DashboardData {
  kpis: KPIs;
  dateRange: { startDate: string | null; endDate: string | null };
  trends?: { revenue: number[]; expenses: number[]; profit: number[] };
}

function KpiCard({ label, value, prefix = '', suffix = '', color, accent, icon, trend, trendData }: {
  label: string; value: number; prefix?: string; suffix?: string; color: string; accent: string; icon: React.ReactNode; trend?: number; trendData?: number[];
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current) { setDisplayValue(value); return; }
    animated.current = true;
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setDisplayValue(value); clearInterval(timer); }
      else setDisplayValue(current);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="relative bg-white rounded-xl border border-surface-200 p-4 sm:p-5 overflow-hidden transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <svg className={`w-3 h-3 ${trend >= 0 ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-xs text-surface-500 mb-1 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-surface-900 truncate">{prefix}{(value % 1 === 0 ? value : displayValue.toFixed(2)).toLocaleString()}{suffix}</p>
      {trendData && trendData.length > 1 && (
        <div className="mt-2 opacity-60">
          <Sparkline data={trendData} color={accent === 'bg-emerald-500' ? '#10b981' : accent === 'bg-red-500' ? '#ef4444' : '#6366f1'} />
        </div>
      )}
    </div>
  );
}

const metricConfig = [
  { key: 'totalRevenue', label: 'Total Revenue', prefix: '$', color: 'bg-emerald-50 text-emerald-600', accent: 'bg-emerald-500', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { key: 'totalExpenses', label: 'Total Expenses', prefix: '$', color: 'bg-red-50 text-red-600', accent: 'bg-red-500', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 21.75h16.5" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { key: 'netProfit', label: 'Net Profit', prefix: '$', color: 'bg-primary-50 text-primary-600', accent: 'bg-primary-500', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75l.75.75m0 0l.75-.75m-.75.75V21" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { key: 'profitMargin', label: 'Profit Margin', suffix: '%', color: 'bg-blue-50 text-blue-600', accent: 'bg-blue-500', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" strokeLinecap="round" strokeLinejoin="round" /></svg> },
];

export default function UnifiedDashboard({ userId }: { userId: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (userId) params.set('userId', userId);
      const res = await fetch(`/api/dashboard/summary?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setData(json.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load dashboard');
    } finally { setLoading(false); }
  }, [startDate, endDate, userId]);

  useEffect(() => {
    if (!fetchedRef.current) { fetchedRef.current = true; fetchData(); }
  }, [fetchData]);

  const handleDownloadExcel = useCallback(async () => {
    try {
      const res = await fetch('/api/reports/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, startDate, endDate }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to generate Excel');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'financial-report.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel report downloaded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download Excel report');
    }
  }, [userId, startDate, endDate]);

  const loadingSkeleton = (
    <div className="space-y-6">
      <CardGridSkeleton count={4} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-surface-200 p-6">
              <div className="h-5 w-32 bg-surface-100 rounded animate-pulse mb-4" />
              <div className="h-48 bg-surface-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div>
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <div className="h-5 w-24 bg-surface-100 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-surface-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return loadingSkeleton;

  if (!data) {
    return (
      <Card padding="lg" className="text-center py-12 sm:py-16">
        <div className="max-w-lg mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-surface-900 mb-2">Welcome to BookKeep</h2>
          <p className="text-surface-500 mb-6">Get started by importing your financial data or adding your first entry.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => window.location.href = '/dashboard?tab=import'}>Import Data</Button>
            <Button size="lg" variant="secondary" onClick={() => window.location.href = '/dashboard?tab=transactions'}>Add Entry</Button>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 text-left">
            {[
              { step: '1', title: 'Import Data', desc: 'Upload CSV or Excel files' },
              { step: '2', title: 'Review & Classify', desc: 'Categorize your transactions' },
              { step: '3', title: 'Run Reports', desc: 'View P&L, balance sheet & more' },
            ].map((s) => (
              <div key={s.step} className="p-4 rounded-lg bg-surface-50 border border-surface-100">
                <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold mb-2">{s.step}</div>
                <p className="text-sm font-semibold text-surface-900">{s.title}</p>
                <p className="text-xs text-surface-400 mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const { kpis } = data;

  return (
    <div className="space-y-6">
      <QuickActions onAction={(tabId) => {
        window.location.href = `/dashboard?tab=${tabId}`;
      }} />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="flex-1 sm:flex-none">
            <label className="block text-xs font-medium text-surface-500 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full sm:w-auto border border-surface-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
          </div>
          <div className="flex-1 sm:flex-none">
            <label className="block text-xs font-medium text-surface-500 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full sm:w-auto border border-surface-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => fetchData()}>Run Report</Button>
          <ShareButton />
          <Button onClick={handleDownloadExcel} variant="secondary" className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricConfig.map((m, idx) => {
          const value = m.key === 'totalRevenue' ? kpis.totalRevenue
            : m.key === 'totalExpenses' ? kpis.totalExpenses
            : m.key === 'netProfit' ? kpis.netProfit
            : kpis.profitMargin;
          const trends = m.key === 'totalRevenue' ? data.trends?.revenue
            : m.key === 'totalExpenses' ? data.trends?.expenses
            : data.trends?.profit;
          const trendVal = trends && trends.length > 1 ? ((trends[trends.length - 1] - trends[0]) / Math.abs(trends[0] || 1)) * 100 : undefined;
          return <KpiCard key={m.key} label={m.label} value={value} prefix={m.prefix} suffix={m.suffix} color={m.color} accent={m.accent} icon={m.icon} trend={trendVal} trendData={trends} />;
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card padding="md">
            <RevenueChart userId={userId} />
          </Card>
          <Card padding="md">
            <ExpenseChart userId={userId} />
          </Card>
        </div>
        <div className="space-y-6">
          <Card padding="md">
            <RecentActivity userId={userId} />
          </Card>
        </div>
      </div>
    </div>
  );
}
