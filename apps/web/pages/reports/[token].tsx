import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface AccountBalance { accountCode: string; accountName: string; balance: number; }
interface StatementSection { title: string; type: string; total: number; accounts: AccountBalance[]; }
interface CashFlowItem { accountCode: string; accountName: string; amount: number; }
interface CashFlowSection { title: string; items: CashFlowItem[]; total: number; }
interface ReportData {
  clientName: string;
  profitLoss: { sections: StatementSection[]; netIncome: number; netIncomeRatio: number; };
  balanceSheet: { sections: StatementSection[]; totalAssets: number; totalLiabilities: number; totalEquity: number; };
  cashFlow: { sections: CashFlowSection[]; totalChange: number; };
  dateRange: { start: string | null; end: string | null; };
}

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function SectionTable({ section }: { section: StatementSection }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-surface-700">{section.title}</h3>
        <span className="text-base font-bold text-surface-900">{fmt(section.total)}</span>
      </div>
      <div className="overflow-x-auto border border-surface-200 rounded-lg">
        <table className="w-full text-xs">
          <tbody>
            {section.accounts.map(acc => (
              <tr key={acc.accountCode} className={`border-t border-surface-100 ${acc.accountCode === 'net-income' ? 'bg-surface-50' : ''}`}>
                <td className="py-1.5 px-3">
                  <span className="font-mono text-surface-400 mr-1.5">{acc.accountCode === 'net-income' ? '' : acc.accountCode}</span>
                  <span className="text-surface-800">{acc.accountName}</span>
                </td>
                <td className="py-1.5 px-3 text-right font-mono font-medium text-surface-900">{fmt(acc.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CFSection({ section }: { section: CashFlowSection }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-surface-700">{section.title}</h3>
        <span className={`text-base font-bold ${section.total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(section.total)}</span>
      </div>
      <div className="overflow-x-auto border border-surface-200 rounded-lg">
        <table className="w-full text-xs">
          <tbody>
            {section.items.map(item => (
              <tr key={item.accountCode} className="border-t border-surface-100">
                <td className="py-1.5 px-3">
                  <span className="font-mono text-surface-400 mr-1.5">{item.accountCode}</span>
                  <span className="text-surface-800">{item.accountName}</span>
                </td>
                <td className={`py-1.5 px-3 text-right font-mono font-medium ${item.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {item.amount >= 0 ? fmt(item.amount) : `(${fmt(Math.abs(item.amount))})`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PublicReport() {
  const router = useRouter();
  const { token, type } = router.query;
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const plRef = useRef<HTMLDivElement>(null);
  const bsRef = useRef<HTMLDivElement>(null);
  const cfRef = useRef<HTMLDivElement>(null);

  const viewType = (typeof type === 'string' && ['pl', 'bs', 'cf'].includes(type)) ? type : 'all';

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams({ token: token as string });
    const sd = router.query.startDate as string;
    const ed = router.query.endDate as string;
    if (sd) params.set('startDate', sd);
    if (ed) params.set('endDate', ed);

    fetch(`/api/public-report?${params.toString()}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setData(json.data);
        else setError(json.error || 'Invalid link');
      })
      .catch(() => setError('Failed to load report'))
      .finally(() => setLoading(false));
  }, [token, router.query.startDate, router.query.endDate]);

  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => {
      if (viewType === 'pl' && plRef.current) plRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (viewType === 'bs' && bsRef.current) bsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (viewType === 'cf' && cfRef.current) cfRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    return () => clearTimeout(timer);
  }, [data, viewType]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ token: token as string, download: 'excel' });
      const sd = router.query.startDate as string;
      const ed = router.query.endDate as string;
      if (sd) params.set('startDate', sd);
      if (ed) params.set('endDate', ed);
      const res = await fetch(`/api/public-report?${params.toString()}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'financial-report.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
    finally { setDownloading(false); }
  };

  const tabLinks = [
    { id: 'all', label: 'All Reports' },
    { id: 'pl', label: 'P&L' },
    { id: 'bs', label: 'Balance Sheet' },
    { id: 'cf', label: 'Cash Flow' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-surface-900 mb-2">Report Not Available</h2>
          <p className="text-sm text-surface-500">{error}</p>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { profitLoss, balanceSheet, cashFlow, clientName } = data;

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-surface-900">Financial Report</h1>
              <p className="text-surface-500 mt-1">Prepared for {clientName}</p>
            </div>
            <button onClick={handleDownload} disabled={downloading}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {downloading ? 'Downloading...' : 'Download Excel'}
            </button>
          </div>

          {/* Section navigation tabs */}
          <div className="flex gap-1 border-b border-surface-200 mb-6">
            {tabLinks.map(t => {
              const href = viewType === t.id ? '#' : `/reports/${token}${t.id === 'all' ? '' : `?type=${t.id}`}`;
              return (
                <a key={t.id} href={href} onClick={(e) => {
                  if (viewType !== t.id) return;
                  e.preventDefault();
                  const ref = t.id === 'pl' ? plRef : t.id === 'bs' ? bsRef : t.id === 'cf' ? cfRef : null;
                  ref?.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                  className={clsx('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                    viewType === t.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-surface-500 hover:text-surface-700')}>
                  {t.label}
                </a>
              );
            })}
          </div>

          {viewType === 'all' || viewType === 'pl' ? (
            <div ref={plRef}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-surface-500 uppercase tracking-wider">Revenue</p>
                  <p className="text-lg font-bold text-emerald-600 mt-1">{fmt(profitLoss.sections.find(s => s.type === 'revenue')?.total || 0)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-surface-500 uppercase tracking-wider">Expenses</p>
                  <p className="text-lg font-bold text-red-500 mt-1">{fmt(profitLoss.sections.find(s => s.type === 'expense')?.total || 0)}</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${profitLoss.netIncome >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <p className="text-xs text-surface-500 uppercase tracking-wider">Net Profit</p>
                  <p className={`text-lg font-bold mt-1 ${profitLoss.netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(profitLoss.netIncome)}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-surface-500 uppercase tracking-wider">Margin</p>
                  <p className="text-lg font-bold text-primary-600 mt-1">{profitLoss.netIncomeRatio.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          ) : null}
        </Card>

        {(viewType === 'all' || viewType === 'pl') && (
          <Card padding="lg" ref={plRef}>
            <h2 className="text-base font-semibold text-surface-900 mb-4">Profit & Loss</h2>
            <div className="space-y-4">
              {profitLoss.sections.map(s => <SectionTable key={s.type} section={s} />)}
            </div>
            <div className="mt-4 p-4 bg-surface-50 rounded-lg border border-surface-200 text-center">
              <p className="text-xs text-surface-500">Net Income</p>
              <p className={`text-xl font-bold ${profitLoss.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(profitLoss.netIncome)}</p>
            </div>
          </Card>
        )}

        {(viewType === 'all' || viewType === 'bs') && (
          <Card padding="lg" ref={bsRef}>
            <h2 className="text-base font-semibold text-surface-900 mb-4">Balance Sheet</h2>
            <div className="space-y-4">
              {balanceSheet.sections.map(s => <SectionTable key={s.type} section={s} />)}
            </div>
            <div className="mt-4 p-4 bg-surface-50 rounded-lg border border-surface-200">
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div><p className="text-xs text-surface-500">Assets</p><p className="font-bold text-indigo-600">{fmt(balanceSheet.totalAssets)}</p></div>
                <div><p className="text-xs text-surface-500">Liabilities</p><p className="font-bold text-red-600">{fmt(balanceSheet.totalLiabilities)}</p></div>
                <div><p className="text-xs text-surface-500">Equity</p><p className="font-bold text-emerald-600">{fmt(balanceSheet.totalEquity)}</p></div>
              </div>
              <p className="text-center text-xs text-surface-400 mt-3">
                {Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilities - balanceSheet.totalEquity) < 0.01
                  ? '✓ Assets = Liabilities + Equity' : '⚠ Out of balance'}
              </p>
            </div>
          </Card>
        )}

        {(viewType === 'all' || viewType === 'cf') && (
          <Card padding="lg" ref={cfRef}>
            <h2 className="text-base font-semibold text-surface-900 mb-4">Cash Flow Statement</h2>
            {cashFlow.sections.every(s => s.items.length === 0) ? (
              <p className="text-sm text-surface-400 text-center py-4">No cash flow data</p>
            ) : (
              <div className="space-y-4">
                {cashFlow.sections.map(s => <CFSection key={s.title} section={s} />)}
                <div className="p-4 bg-surface-50 rounded-lg border border-surface-200 text-center">
                  <p className="text-xs text-surface-500">Net Change in Cash</p>
                  <p className={`text-xl font-bold ${cashFlow.totalChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(cashFlow.totalChange)}</p>
                </div>
              </div>
            )}
          </Card>
        )}

        <p className="text-center text-xs text-surface-400">Generated by Bookkeeping Platform</p>
      </div>
    </div>
  );
}

export function getServerSideProps() {
  return { props: {} };
}
