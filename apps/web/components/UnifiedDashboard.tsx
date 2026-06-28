import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, Button, CardGridSkeleton, Tabs } from '@/components/ui';
import ShareButton from '@/components/ShareButton';
import RevenueChart from '@/components/RevenueChart';
import ExpenseChart from '@/components/ExpenseChart';
import QuickActions from '@/components/QuickActions';
import RecentActivity from '@/components/RecentActivity';
import DashboardFilters from '@/components/DashboardFilters';
import CategoryChart from '@/components/CategoryChart';
import TopCategories from '@/components/TopCategories';
import ComparisonChart from '@/components/ComparisonChart';
import ForecastChart from '@/components/ForecastChart';
import InsightsPanel from '@/components/InsightsPanel';
import DrillDownModal, { type DrillState, type DrillType } from '@/components/DrillDownModal';
import KpiCard from '@/components/KpiCard';
import toast from 'react-hot-toast';

interface KPIs {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  entryCount: number;
  cashBalance: number;
}

interface CategoryStat {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

interface DashboardData {
  kpis: KPIs;
  dateRange: { startDate: string | null; endDate: string | null };
  trends?: { revenue: number[]; expenses: number[]; profit: number[] };
  revenueByCategory?: CategoryStat[];
  expensesByCategory?: CategoryStat[];
  topCategories?: CategoryStat[];
  baseCurrency?: string;
}

const metricConfig: { key: string; label: string; isCurrency: boolean; suffix?: string; color: string; accent: string; icon: React.ReactNode }[] = [
  { key: 'totalRevenue', label: 'Total Revenue', isCurrency: true, color: 'bg-emerald-50 text-emerald-600', accent: 'bg-emerald-500', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { key: 'totalExpenses', label: 'Total Expenses', isCurrency: true, color: 'bg-red-50 text-red-600', accent: 'bg-red-500', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 21.75h16.5" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { key: 'netProfit', label: 'Net Profit', isCurrency: true, color: 'bg-primary-50 text-primary-600', accent: 'bg-primary-500', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75l.75.75m0 0l.75-.75m-.75.75V21" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { key: 'profitMargin', label: 'Profit Margin', isCurrency: false, suffix: '%', color: 'bg-blue-50 text-blue-600', accent: 'bg-blue-500', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { key: 'cashBalance', label: 'Cash Balance', isCurrency: true, color: 'bg-amber-50 text-amber-600', accent: 'bg-amber-500', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 21.75h16.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { key: 'entryCount', label: 'Total Entries', isCurrency: false, color: 'bg-purple-50 text-purple-600', accent: 'bg-purple-500', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" strokeLinecap="round" strokeLinejoin="round" /></svg> },
];

export default function UnifiedDashboard({ userId }: { userId: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const fetchedRef = useRef(false);
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillState, setDrillState] = useState<DrillState | null>(null);
  const [chartTab, setChartTab] = useState('revenue-expenses');

  const handleKpiClick = useCallback((type: DrillType) => {
    setDrillState({ type, params: { startDate, endDate } });
    setDrillOpen(true);
  }, [startDate, endDate]);

  const handleMonthClick = useCallback((month: string) => {
    setDrillState({ type: 'month-revenue', params: { month } });
    setDrillOpen(true);
  }, []);

  const handleExpenseMonthClick = useCallback((month: string) => {
    setDrillState({ type: 'month-expense', params: { month } });
    setDrillOpen(true);
  }, []);

  const handleCategoryClick = useCallback((category: string) => {
    setDrillState({ type: 'category-detail', params: { category, startDate, endDate } });
    setDrillOpen(true);
  }, [startDate, endDate]);

  const handleDrillChange = useCallback((newDrill: DrillState) => {
    setDrillState(newDrill);
  }, []);

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (showLoading) { setLoading(true); setError(null); }
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (userId) params.set('userId', userId);
      const res = await fetch(`/api/dashboard/summary?${params.toString()}`, { signal: controller.signal });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setData(json.data);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      toast.error(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally { if (abortRef.current === controller) setLoading(false); }
  }, [startDate, endDate, userId]);

  useEffect(() => {
    if (!fetchedRef.current) { fetchedRef.current = true; fetchData(); }
    return () => { abortRef.current?.abort(); fetchedRef.current = false; };
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to download Excel report');
    }
  }, [userId, startDate, endDate]);

  const [pdfDownloading, setPdfDownloading] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    setPdfDownloading(true);
    try {
      const res = await fetch('/api/reports/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, startDate, endDate }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to generate PDF');
      }
      const binary = atob(body.pdf);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF report downloaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to download PDF report');
    } finally {
      setPdfDownloading(false);
    }
  }, [userId, startDate, endDate]);

  const loadingSkeleton = (
    <div className="space-y-6">
      <CardGridSkeleton count={6} />
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

  const chartMonths = useMemo(() => {
    if (!startDate) return 12;
    const sd = new Date(startDate);
    const ed = endDate ? new Date(endDate) : new Date();
    return Math.max(1, Math.round((ed.getTime() - sd.getTime()) / (30 * 86400000)));
  }, [startDate, endDate]);

  if (loading) return loadingSkeleton;

  if (!data) {
    if (error) {
      return (
        <Card padding="lg" className="text-center py-12 sm:py-16">
          <div className="max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-surface-900 mb-2">Failed to Load Dashboard</h2>
            <p className="text-surface-500 mb-6">{error}</p>
            <Button size="lg" onClick={() => fetchData()}>Retry</Button>
          </div>
        </Card>
      );
    }

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
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
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

  const { kpis, revenueByCategory, expensesByCategory } = data;

  return (
    <div className="space-y-6 print-report">
      <QuickActions onAction={(tabId) => {
        window.location.href = `/dashboard?tab=${tabId}`;
      }} />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 no-print bg-white rounded-xl border border-surface-200 p-4 animate-slide-up" style={{ animationDelay: '0.05s', animationFillMode: 'backwards' }}>
        <div className="flex-1">
          <DashboardFilters startDate={startDate} endDate={endDate} onChange={(sd, ed) => { setStartDate(sd); setEndDate(ed); }} />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => fetchData()}>Run Report</Button>
          <div className="w-px h-6 bg-surface-200 mx-1 hidden sm:block" />
          <ShareButton />
          <Button onClick={handleDownloadPdf} loading={pdfDownloading} variant="secondary" className="flex items-center gap-1.5 !px-2.5 sm:!px-3">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 14.78l-1.5 1.5a1.5 1.5 0 002.12 2.12l1.5-1.5M9 18h6M15 5.22l1.5-1.5a1.5 1.5 0 012.12 2.12l-1.5 1.5" />
            </svg>
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button onClick={() => window.print()} variant="secondary" className="flex items-center gap-1.5 !px-2.5 sm:!px-3 no-print">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button onClick={handleDownloadExcel} variant="secondary" className="flex items-center gap-1.5 !px-2.5 sm:!px-3">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Excel</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {metricConfig.map((m, idx) => {
          const value = m.key === 'totalRevenue' ? kpis.totalRevenue
            : m.key === 'totalExpenses' ? kpis.totalExpenses
            : m.key === 'netProfit' ? kpis.netProfit
            : m.key === 'profitMargin' ? kpis.profitMargin
            : m.key === 'cashBalance' ? kpis.cashBalance
            : kpis.entryCount;
          const trends = m.key === 'totalRevenue' ? data.trends?.revenue
            : m.key === 'totalExpenses' ? data.trends?.expenses
            : data.trends?.profit;
          const trendVal = trends && trends.length > 1 ? ((trends[trends.length - 1] - trends[0]) / Math.abs(trends[0] || 1)) * 100 : undefined;
          const drillType = m.key === 'totalRevenue' ? 'revenue' : m.key === 'totalExpenses' ? 'expenses' : m.key === 'netProfit' ? 'net-profit' : m.key === 'profitMargin' ? 'profit-margin' : m.key === 'cashBalance' ? 'cash-balance' : 'entries';
          return <KpiCard key={m.key} label={m.label} value={value} suffix={m.suffix} color={m.color} accent={m.accent} icon={m.icon} trend={trendVal} trendData={trends} isCurrency={m.isCurrency} currency={data.baseCurrency} onClick={() => handleKpiClick(drillType)} index={idx} />;
        })}
      </div>

      <Tabs
        tabs={[
          { id: 'revenue-expenses', label: 'Revenue & Expenses' },
          { id: 'category-breakdown', label: 'Category Breakdown' },
          { id: 'analysis-forecasts', label: 'Analysis & Forecasts' },
        ]}
        activeTab={chartTab}
        onChange={setChartTab}
        className="mb-6"
      />

      {chartTab === 'revenue-expenses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <RevenueChart userId={userId} months={chartMonths} onMonthClick={handleMonthClick} />
            <ExpenseChart userId={userId} months={chartMonths} onMonthClick={handleExpenseMonthClick} />
          </div>
          <div className="space-y-6">
            <Card padding="md">
              <RecentActivity userId={userId} />
            </Card>
          </div>
        </div>
      )}

      {chartTab === 'category-breakdown' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {expensesByCategory && expensesByCategory.length > 0 && (
            <CategoryChart data={expensesByCategory} onCategoryClick={handleCategoryClick} baseCurrency={data.baseCurrency} />
          )}
          {(revenueByCategory && revenueByCategory.length > 0) && (
            <TopCategories revenueByCategory={revenueByCategory} expensesByCategory={expensesByCategory || []} baseCurrency={data.baseCurrency} />
          )}
        </div>
      )}

      {chartTab === 'analysis-forecasts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ComparisonChart userId={userId} startDate={startDate} endDate={endDate} onMonthClick={handleMonthClick} />
            <ForecastChart userId={userId} startDate={startDate} endDate={endDate} onMonthClick={handleMonthClick} />
          </div>
          <div className="space-y-6">
            <InsightsPanel userId={userId} startDate={startDate} endDate={endDate} />
          </div>
        </div>
      )}

      {drillOpen && drillState && (
        <DrillDownModal open={drillOpen} onClose={() => setDrillOpen(false)} drill={drillState} onDrill={handleDrillChange} userId={userId} />
      )}
    </div>
  );
}
