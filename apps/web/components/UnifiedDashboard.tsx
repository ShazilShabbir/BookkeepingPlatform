import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Button } from '@/components/ui';
import ShareButton from '@/components/ShareButton';
import RevenueChart from '@/components/RevenueChart';
import ExpenseChart from '@/components/ExpenseChart';
import ActivityFeed from '@/components/ActivityFeed';
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
}

function KpiCard({ label, value, prefix = '', suffix = '', color, bgColor, icon }: {
  label: string; value: number; prefix?: string; suffix?: string; color: string; bgColor: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${bgColor} ${color}`}>{icon}</div>
      </div>
      <p className="text-sm text-surface-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{prefix}{value.toFixed(suffix === '%' ? 1 : 2)}{suffix}</p>
    </div>
  );
}

const metricConfig = [
  { key: 'totalRevenue', label: 'Total Revenue', prefix: '$', color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { key: 'totalExpenses', label: 'Total Expenses', prefix: '$', color: 'text-red-600', bgColor: 'bg-red-50', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 21.75h16.5" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { key: 'netProfit', label: 'Net Profit', prefix: '$', color: 'text-primary-600', bgColor: 'bg-primary-50', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75l.75.75m0 0l.75-.75m-.75.75V21" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { key: 'profitMargin', label: 'Profit Margin', suffix: '%', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" strokeLinecap="round" strokeLinejoin="round" /></svg> },
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

      const res = await fetch(`/api/dashboard/summary?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setData(json.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-surface-200 p-5 animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-surface-100 mb-3" />
              <div className="h-4 w-24 bg-surface-100 rounded mb-2" />
              <div className="h-7 w-32 bg-surface-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card padding="lg" className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-surface-900 mb-2">Welcome to BookKeep</h2>
          <p className="text-surface-500 mb-8">Import your first CSV to see financial reports</p>
        </div>
      </Card>
    );
  }

  const { kpis } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm bg-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm bg-white" />
        </div>
        <Button onClick={() => fetchData()} loading={loading}>Run Report</Button>
        <ShareButton />
        <Button onClick={handleDownloadExcel} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricConfig.map(m => {
          const value = m.key === 'totalRevenue' ? kpis.totalRevenue
            : m.key === 'totalExpenses' ? kpis.totalExpenses
            : m.key === 'netProfit' ? kpis.netProfit
            : kpis.profitMargin;
          return <KpiCard key={m.key} label={m.label} value={value} prefix={m.prefix} suffix={m.suffix} color={m.color} bgColor={m.bgColor} icon={m.icon} />;
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RevenueChart />
          <ExpenseChart />
        </div>
        <div className="space-y-6">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
