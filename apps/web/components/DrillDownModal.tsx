import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';

export type DrillType = 'revenue' | 'expenses' | 'net-profit' | 'profit-margin' | 'cash-balance' | 'entries' | 'month-revenue' | 'month-expense' | 'category-detail' | 'entry-detail' | 'account-journal';

interface DrillParams {
  startDate?: string;
  endDate?: string;
  month?: string;
  category?: string;
  accountCode?: string;
  entryId?: string;
  page?: number;
  limit?: number;
}

export interface DrillState {
  type: DrillType;
  params: DrillParams;
}

interface DrillBreadcrumb {
  label: string;
  state: DrillState;
}

interface DrillDownModalProps {
  open: boolean;
  onClose: () => void;
  drill: DrillState;
  onDrill: (state: DrillState) => void;
  userId: string;
}

function fetchDrillData(userId: string, type: DrillType, params: DrillParams) {
  const q = new URLSearchParams();
  q.set('type', type);
  q.set('userId', userId);
  if (params.startDate) q.set('startDate', params.startDate);
  if (params.endDate) q.set('endDate', params.endDate);
  if (params.month) q.set('month', params.month);
  if (params.category) q.set('category', params.category);
  if (params.accountCode) q.set('accountCode', params.accountCode);
  if (params.entryId) q.set('entryId', params.entryId);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  return fetch(`/api/dashboard/drilldown?${q.toString()}`).then(r => r.json());
}

const LABELS: Record<DrillType, string> = {
  'revenue': 'Revenue Breakdown',
  'expenses': 'Expense Breakdown',
  'net-profit': 'Net Profit Detail',
  'profit-margin': 'Profit Margin Trend',
  'cash-balance': 'Cash Balance Detail',
  'entries': 'All Entries',
  'month-revenue': 'Monthly Revenue',
  'month-expense': 'Monthly Expenses',
  'category-detail': 'Category Detail',
  'entry-detail': 'Entry Detail',
  'account-journal': 'Account Journal',
};

export default function DrillDownModal({ open, onClose, drill, onDrill, userId }: DrillDownModalProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [breadcrumbs, setBreadcrumbs] = useState<DrillBreadcrumb[]>([{ label: LABELS[drill.type], state: drill }]);
  const currentDrill = breadcrumbs[breadcrumbs.length - 1].state;

  const load = useCallback(async (d: DrillState) => {
    setLoading(true); setError('');
    try {
      const json = await fetchDrillData(userId, d.type, d.params);
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setData(json.data);
      if ((json.data as any)?.baseCurrency) setBaseCurrency((json.data as any).baseCurrency);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading data');
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { if (open) { setBreadcrumbs([{ label: LABELS[drill.type], state: drill }]); load(drill); } }, [open, drill, load]);

  const drillTo = (type: DrillType, params: DrillParams, label: string) => {
    const newState = { type, params };
    setBreadcrumbs(prev => [...prev, { label, state: newState }]);
    load(newState);
  };

  const goBack = () => {
    if (breadcrumbs.length <= 1) return;
    const updated = breadcrumbs.slice(0, -1);
    setBreadcrumbs(updated);
    load(updated[updated.length - 1].state);
  };

  const handleClose = () => {
    setBreadcrumbs([]);
    setData(null);
    setError('');
    onClose();
  };

  const openTransactionsTab = (extraParams?: string) => {
    const base = '/dashboard?tab=transactions';
    const q = base + (extraParams || '');
    window.location.href = q;
  };

  if (!open) return null;

  const renderBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm mb-4">
      {breadcrumbs.length > 1 && (
        <button onClick={goBack} className="p-1 text-surface-400 hover:text-surface-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      {breadcrumbs.map((b, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-surface-300 mx-1">/</span>}
          <span className={i === breadcrumbs.length - 1 ? 'text-surface-900 font-medium' : 'text-surface-500'}>{b.label}</span>
        </span>
      ))}
    </div>
  );

  const renderPagination = (total: number, totalPages: number, page: number) => (
    <div className="flex items-center justify-between mt-4 text-sm text-surface-500">
      <span>{total} total</span>
      <div className="flex gap-1">
        <button disabled={page <= 1} onClick={() => drillTo(currentDrill.type, { ...currentDrill.params, page: page - 1 }, LABELS[currentDrill.type])} className="px-2 py-1 text-xs border border-surface-200 rounded hover:bg-surface-50 disabled:opacity-30">Prev</button>
        <button disabled={page >= totalPages} onClick={() => drillTo(currentDrill.type, { ...currentDrill.params, page: page + 1 }, LABELS[currentDrill.type])} className="px-2 py-1 text-xs border border-surface-200 rounded hover:bg-surface-50 disabled:opacity-30">Next</button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) return (<div className="py-12 text-center"><div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto" /><p className="mt-2 text-sm text-surface-400">Loading...</p></div>);
    if (error) return (<div className="py-12 text-center"><p className="text-red-500 text-sm mb-3">{error}</p><Button size="sm" onClick={() => load(currentDrill)}>Retry</Button></div>);
    if (!data) return (<div className="py-12 text-center text-surface-400 text-sm">No data</div>);

    const d = data as any;

    switch (currentDrill.type) {
      case 'revenue':
      case 'expenses': {
        const isRev = currentDrill.type === 'revenue';
        const bd = d.breakdown || [];
        return (
          <div>
            <p className="text-sm text-surface-500 mb-3">Total: {formatCurrencyCompact(Number(d.total) || 0, baseCurrency)}</p>
            {bd.length === 0 ? <p className="text-center py-8 text-surface-400 text-sm">No data</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-surface-500 border-b border-surface-200"><th scope="col" className="pb-2 font-medium">Category</th><th scope="col" className="pb-2 font-medium text-right">Amount</th><th scope="col" className="pb-2 font-medium text-right">%</th><th scope="col" className="pb-2 font-medium text-right">Count</th></tr></thead>
                  <tbody>{bd.map((r: any) => (
                    <tr key={r.category} className="border-b border-surface-100 cursor-pointer hover:bg-surface-50" onClick={() => drillTo('category-detail', { category: r.category, startDate: currentDrill.params.startDate, endDate: currentDrill.params.endDate }, r.category)}>
                      <td className="py-2 text-surface-900">{r.category}</td>
                      <td className={`py-2 text-right ${isRev ? 'text-green-600' : 'text-red-600'}`}>{formatCurrencyCompact(r.amount, baseCurrency)}</td>
                      <td className="py-2 text-right text-surface-600">{r.percentage}%</td>
                      <td className="py-2 text-right text-surface-600">{r.count}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        );
      }

      case 'net-profit': {
        return (
          <div className="space-y-3">
            {[
              { label: 'Total Revenue', value: d.revenue, color: 'text-green-600' },
              { label: 'Total Expenses', value: d.expenses, color: 'text-red-600' },
              { label: 'Net Profit', value: d.netProfit, color: d.netProfit >= 0 ? 'text-green-600' : 'text-red-600' },
              { label: 'Profit Margin', value: `${d.margin}%`, color: 'text-surface-900' },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between py-2 border-b border-surface-100">
                <span className="text-sm text-surface-600">{r.label}</span>
                <span className={`text-sm font-semibold ${r.color}`}>{typeof r.value === 'number' ? formatCurrencyCompact(r.value, baseCurrency) : r.value}</span>
              </div>
            ))}
          </div>
        );
      }

      case 'profit-margin': {
        const monthly = d.monthly || [];
        if (monthly.length === 0) return <p className="text-center py-8 text-surface-400 text-sm">No data</p>;
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-surface-500 border-b border-surface-200"><th scope="col" className="pb-2 font-medium">Month</th><th scope="col" className="pb-2 font-medium text-right">Margin</th></tr></thead>
              <tbody>{monthly.map((r: any) => (
                <tr key={r.month} className="border-b border-surface-100">
                  <td className="py-2 text-surface-900">{r.month}</td>
                  <td className={`py-2 text-right font-medium ${r.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{r.margin}%</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        );
      }

      case 'cash-balance': {
        const accounts = d.accounts || [];
        return (
          <div>
            <p className="text-sm text-surface-500 mb-3">Total: {formatCurrencyCompact(Number(d.total) || 0, baseCurrency)}</p>
            {accounts.length === 0 ? <p className="text-center py-8 text-surface-400 text-sm">No cash accounts</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-surface-500 border-b border-surface-200"><th scope="col" className="pb-2 font-medium">Account</th><th scope="col" className="pb-2 font-medium text-right">Balance</th></tr></thead>
                  <tbody>{accounts.map((r: any) => (
                    <tr key={r.accountCode} className="border-b border-surface-100 cursor-pointer hover:bg-surface-50" onClick={() => drillTo('account-journal', { accountCode: r.accountCode }, r.accountName)}>
                      <td className="py-2 text-surface-900">{r.accountName} <span className="text-surface-400 text-xs ml-1">{r.accountCode}</span></td>
                      <td className="py-2 text-right font-medium text-surface-900">{formatCurrencyCompact(r.balance, baseCurrency)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        );
      }

      case 'entries':
      case 'month-revenue':
      case 'month-expense': {
        const entries = d.entries || [];
        const pg = Number(d.page) || 1;
        const tp = Number(d.totalPages) || 1;
        const tc = Number(d.total) || 0;
        return (
          <div>
            {renderPagination(tc, tp, pg)}
            {entries.length === 0 ? <p className="text-center py-8 text-surface-400 text-sm">No entries</p> : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-surface-500 border-b border-surface-200"><th scope="col" className="pb-2 font-medium">Date</th><th scope="col" className="pb-2 font-medium">Description</th><th scope="col" className="pb-2 font-medium text-right">Amount</th></tr></thead>
                  <tbody>{entries.map((r: any) => (
                    <tr key={r._id} className="border-b border-surface-100 cursor-pointer hover:bg-surface-50" onClick={() => drillTo('entry-detail', { entryId: r._id }, 'Entry')}>
                      <td className="py-2 text-surface-600 text-xs">{r.date?.slice(0, 10)}</td>
                      <td className="py-2 text-surface-900 max-w-[200px] truncate">{r.description || '—'}</td>
                      <td className="py-2 text-right font-medium text-surface-900">{formatCurrencyCompact(r.amount, baseCurrency)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <div className="flex justify-between items-center mt-4">
              <button onClick={() => openTransactionsTab(currentDrill.params.month ? `&dateFrom=${currentDrill.params.month}-01` : '')} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                View in Transactions →
              </button>
              {renderPagination(tc, tp, pg)}
            </div>
          </div>
        );
      }

      case 'category-detail': {
        const accounts = d.accounts || [];
        const isEmpty = accounts.length === 0;
        return (
          <div>
            <p className="text-sm text-surface-500 mb-3">Total: {formatCurrencyCompact(Number(d.total) || 0, baseCurrency)}</p>
            {isEmpty ? <p className="text-center py-8 text-surface-400 text-sm">No data</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-surface-500 border-b border-surface-200"><th scope="col" className="pb-2 font-medium">Account</th><th scope="col" className="pb-2 font-medium text-right">Amount</th><th scope="col" className="pb-2 font-medium text-right">%</th></tr></thead>
                  <tbody>{accounts.map((r: any) => (
                    <tr key={r.accountCode} className="border-b border-surface-100 cursor-pointer hover:bg-surface-50" onClick={() => drillTo('account-journal', { accountCode: r.accountCode }, r.accountName)}>
                      <td className="py-2 text-surface-900">{r.accountName} <span className="text-surface-400 text-xs ml-1">{r.accountCode}</span></td>
                      <td className={`py-2 text-right font-medium ${r.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrencyCompact(r.amount, baseCurrency)}</td>
                      <td className="py-2 text-right text-surface-600">{r.percentage}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <div className="mt-4">
              <button onClick={() => openTransactionsTab()} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                View in Transactions →
              </button>
            </div>
          </div>
        );
      }

      case 'entry-detail': {
        const entry = d.entry || {};
        const lines = d.lines || [];
        const totalDebit = lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
        const totalCredit = lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
        return (
          <div className="space-y-4">
            <div className="text-sm space-y-1">
              <p><span className="text-surface-500">Date:</span> <span className="text-surface-900 font-medium">{entry.date?.slice(0, 10)}</span></p>
              <p><span className="text-surface-500">Description:</span> <span className="text-surface-900">{entry.description || '—'}</span></p>
            </div>
            {lines.length === 0 ? <p className="text-center py-4 text-surface-400 text-sm">No lines</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-surface-500 border-b border-surface-200"><th scope="col" className="pb-2 font-medium">Account</th><th scope="col" className="pb-2 font-medium text-right">Debit</th><th scope="col" className="pb-2 font-medium text-right">Credit</th></tr></thead>
                  <tbody>{lines.map((l: any, i: number) => (
                    <tr key={i} className="border-b border-surface-100">
                      <td className="py-2 text-surface-900">{l.accountName} <span className="text-surface-400 text-xs ml-1">{l.accountCode}</span></td>
                      <td className="py-2 text-right text-surface-900">{l.debit > 0 ? formatCurrency(l.debit, baseCurrency) : '—'}</td>
                      <td className="py-2 text-right text-surface-900">{l.credit > 0 ? formatCurrency(l.credit, baseCurrency) : '—'}</td>
                    </tr>
                  ))}</tbody>
                  <tfoot>
                    <tr className="border-t-2 border-surface-300 font-semibold">
                      <td className="py-2 text-surface-700">Total</td>
                      <td className="py-2 text-right">{formatCurrency(totalDebit, baseCurrency)}</td>
                      <td className="py-2 text-right">{formatCurrency(totalCredit, baseCurrency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            <button onClick={() => openTransactionsTab()} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              View in Transactions →
            </button>
          </div>
        );
      }

      case 'account-journal': {
        const info = d.accountInfo || {};
        const lines = d.lines || [];
        const pg = Number(d.page) || 1;
        const tp = Number(d.totalPages) || 1;
        const tc = Number(d.total) || 0;
        return (
          <div>
            <div className="text-sm mb-3">
              <span className="text-surface-500">{info.name}</span>
              <span className="text-surface-400 text-xs ml-2">{info.code}</span>
              <span className="text-surface-400 text-xs ml-2">({info.type})</span>
            </div>
            {renderPagination(tc, tp, pg)}
            {lines.length === 0 ? <p className="text-center py-8 text-surface-400 text-sm">No journal lines</p> : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-surface-500 border-b border-surface-200"><th scope="col" className="pb-2 font-medium">Date</th><th scope="col" className="pb-2 font-medium">Description</th><th scope="col" className="pb-2 font-medium text-right">Debit</th><th scope="col" className="pb-2 font-medium text-right">Credit</th></tr></thead>
                  <tbody>{lines.map((l: any, i: number) => (
                    <tr key={i} className="border-b border-surface-100">
                      <td className="py-2 text-surface-600 text-xs">{l.date?.slice(0, 10)}</td>
                      <td className="py-2 text-surface-900 max-w-[200px] truncate">{l.description || '—'}</td>
                      <td className="py-2 text-right text-surface-900">{l.debit > 0 ? formatCurrency(l.debit, baseCurrency) : '—'}</td>
                      <td className="py-2 text-right text-surface-900">{l.credit > 0 ? formatCurrency(l.credit, baseCurrency) : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <div className="flex justify-between items-center mt-4">
              <button onClick={() => openTransactionsTab(`&accountCode=${info.code}`)} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                View in Transactions →
              </button>
              {renderPagination(tc, tp, pg)}
            </div>
          </div>
        );
      }

      default:
        return <p className="text-center py-8 text-surface-400 text-sm">Unknown drill type</p>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-2">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-elevated w-full max-w-2xl max-h-[80vh] flex flex-col z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <div className="flex-1 min-w-0">
            {renderBreadcrumb()}
          </div>
          <button onClick={handleClose} className="p-1 text-surface-400 hover:text-surface-600 ml-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
