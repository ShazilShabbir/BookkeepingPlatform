import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Button } from '@/components/ui';
import toast from 'react-hot-toast';

interface AccountBalance { accountCode: string; accountName: string; balance: number; }
interface StatementSection { title: string; type: string; total: number; accounts: AccountBalance[]; }
interface CashFlowItem { accountCode: string; accountName: string; amount: number; }
interface CashFlowSection { title: string; items: CashFlowItem[]; total: number; }
interface TrialBalanceRow {
  accountCode: string; accountName: string; accountType: string;
  normalBalance: string; totalDebits: number; totalCredits: number; netBalance: number;
}

interface DashboardData {
  kpis: { totalRevenue: number; totalExpenses: number; netProfit: number; profitMargin: number; entryCount: number };
  profitLoss: { sections: StatementSection[]; netIncome: number; netIncomeRatio: number };
  balanceSheet: { sections: StatementSection[]; totalAssets: number; totalLiabilities: number; totalEquity: number };
  cashFlow: { sections: CashFlowSection[]; totalChange: number };
  trialBalance: { rows: TrialBalanceRow[]; totals: { totalDebits: number; totalCredits: number; difference: number; balanced: boolean } };
  dateRange: { startDate: string | null; endDate: string | null };
}

type ReportView = 'pl' | 'bs' | 'cf' | 'tb' | 'all';

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const tabs: { id: ReportView; label: string }[] = [
  { id: 'all', label: 'All Reports' },
  { id: 'pl', label: 'P&L' },
  { id: 'bs', label: 'Balance Sheet' },
  { id: 'cf', label: 'Cash Flow' },
  { id: 'tb', label: 'Trial Balance' },
];

export default function ReportPanel() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [view, setView] = useState<ReportView>('all');
  const [downloading, setDownloading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/dashboard/summary?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setData(json.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!fetchedRef.current) { fetchedRef.current = true; fetchData(); }
  }, [fetchData]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/reports/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to generate Excel');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel report downloaded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download Excel report');
    } finally {
      setDownloading(false);
    }
  };

  const renderPL = () => {
    if (!data) return null;
    const { profitLoss } = data;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        {profitLoss.sections.map(section => (
          <div key={section.type}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-surface-700">{section.title}</h3>
              <span className="text-base font-bold text-surface-900">{fmt(section.total)}</span>
            </div>
            {section.accounts.length === 0 ? (
              <p className="text-xs text-surface-400 py-2">No accounts in this category</p>
            ) : (
              <div className="overflow-x-auto border border-surface-200 rounded-lg">
                <table className="w-full text-sm">
                  <tbody>
                    {section.accounts.map((acc, idx) => (
                      <tr key={`${acc.accountCode}-${idx}`} className="border-t border-surface-100 hover:bg-surface-50">
                        <td className="py-2 px-4">
                          <span className="font-mono text-surface-400 mr-2">{acc.accountCode}</span>
                          <span className="text-surface-900">{acc.accountName}</span>
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-medium text-surface-900">{fmt(acc.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderBS = () => {
    if (!data) return null;
    const { balanceSheet } = data;
    return (
      <div className="space-y-4">
        {balanceSheet.sections.map(section => (
          <div key={section.type}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-surface-700">{section.title}</h3>
              <span className="text-base font-bold text-surface-900">{fmt(section.total)}</span>
            </div>
            {section.accounts.length === 0 ? (
              <p className="text-xs text-surface-400 py-2">No accounts in this category</p>
            ) : (
              <div className="overflow-x-auto border border-surface-200 rounded-lg">
                <table className="w-full text-sm">
                  <tbody>
                    {section.accounts.map((acc, idx) => (
                      <tr key={`${acc.accountCode}-${idx}`} className={`border-t border-surface-100 hover:bg-surface-50 ${acc.accountCode === 'net-income' ? 'bg-surface-50 font-medium' : ''}`}>
                        <td className="py-2 px-4">
                          <span className="font-mono text-surface-400 mr-2">{acc.accountCode === 'net-income' ? '' : acc.accountCode}</span>
                          <span className="text-surface-900">{acc.accountName}</span>
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-medium text-surface-900">
                          {acc.balance >= 0 ? fmt(acc.balance) : `(${fmt(Math.abs(acc.balance))})`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Total Assets</p><p className="text-xl font-bold text-primary-600 mt-1">{fmt(balanceSheet.totalAssets)}</p></div>
            <div><p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Total Liabilities</p><p className="text-xl font-bold text-amber-600 mt-1">{fmt(balanceSheet.totalLiabilities)}</p></div>
            <div><p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Total Equity</p><p className="text-xl font-bold text-emerald-600 mt-1">{fmt(balanceSheet.totalEquity)}</p></div>
          </div>
        </div>
      </div>
    );
  };

  const renderCF = () => {
    if (!data) return null;
    const { cashFlow } = data;
    if (cashFlow.sections.every(s => s.items.length === 0)) {
      return <p className="text-sm text-surface-400 text-center py-8">No cash flow data available</p>;
    }
    return (
      <div className="space-y-4">
        {cashFlow.sections.map(section => (
          <div key={section.title}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-surface-700">{section.title}</h3>
              <span className={`text-base font-bold ${section.total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(section.total)}</span>
            </div>
            <div className="overflow-x-auto border border-surface-200 rounded-lg">
              <table className="w-full text-sm">
                <tbody>
                  {section.items.map((item, idx) => (
                    <tr key={`${item.accountCode}-${idx}`} className="border-t border-surface-100 hover:bg-surface-50">
                      <td className="py-2 px-4">
                        <span className="font-mono text-surface-400 mr-2">{item.accountCode}</span>
                        <span className="text-surface-900">{item.accountName}</span>
                      </td>
                      <td className={`py-2 px-4 text-right font-mono font-medium ${item.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {item.amount >= 0 ? fmt(item.amount) : `(${fmt(Math.abs(item.amount))}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 flex items-center justify-between">
          <div><p className="text-sm font-semibold text-surface-700">Net Change in Cash</p><p className="text-xs text-surface-400">Operating + Investing + Financing</p></div>
          <p className={`text-2xl font-bold ${cashFlow.totalChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(cashFlow.totalChange)}</p>
        </div>
      </div>
    );
  };

  const renderTB = () => {
    if (!data) return null;
    const { trialBalance } = data;
    if (trialBalance.rows.length === 0) {
      return <p className="text-sm text-surface-400 text-center py-8">No trial balance data available</p>;
    }
    return (
      <div>
        <div className="overflow-x-auto border border-surface-200 rounded-lg">
          <table className="w-full text-sm">
            <thead><tr className="bg-surface-100">
              <th className="py-2 px-3 text-left font-medium text-surface-600">Code</th>
              <th className="py-2 px-3 text-left font-medium text-surface-600">Account</th>
              <th className="py-2 px-3 text-left font-medium text-surface-600">Type</th>
              <th className="py-2 px-3 text-right font-medium text-surface-600">Debits</th>
              <th className="py-2 px-3 text-right font-medium text-surface-600">Credits</th>
              <th className="py-2 px-3 text-right font-medium text-surface-600">Balance</th>
            </tr></thead>
            <tbody>
              {trialBalance.rows.map((row, idx) => (
                <tr key={`${row.accountCode}-${idx}`} className="border-t border-surface-100 hover:bg-surface-50">
                  <td className="py-2 px-3 font-mono text-surface-400">{row.accountCode}</td>
                  <td className="py-2 px-3 text-surface-900">{row.accountName}</td>
                  <td className="py-2 px-3 text-surface-500">{row.accountType}</td>
                  <td className="py-2 px-3 text-right font-mono">{row.totalDebits.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono">{row.totalCredits.toFixed(2)}</td>
                  <td className={`py-2 px-3 text-right font-mono font-medium ${row.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {row.netBalance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-50 font-semibold border-t-2 border-surface-300">
                <td colSpan={3} className="py-2 px-3 text-surface-700">TOTAL</td>
                <td className="py-2 px-3 text-right font-mono text-surface-900">{trialBalance.totals.totalDebits.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono text-surface-900">{trialBalance.totals.totalCredits.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono text-surface-900">{trialBalance.totals.difference.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="mt-3 text-center">
          <span className={`text-xs font-medium ${trialBalance.totals.balanced ? 'text-emerald-600' : 'text-red-600'}`}>
            {trialBalance.totals.balanced ? '✓ Trial Balance is balanced' : '⚠ Trial Balance is out of balance'}
          </span>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!data) return null;
    switch (view) {
      case 'pl': return renderPL();
      case 'bs': return renderBS();
      case 'cf': return renderCF();
      case 'tb': return renderTB();
      default: return (
        <div className="space-y-8">
          <div><h3 className="text-base font-semibold text-surface-900 mb-4">Profit & Loss</h3>{renderPL()}</div>
          <div className="border-t border-surface-200 pt-8"><h3 className="text-base font-semibold text-surface-900 mb-4">Balance Sheet</h3>{renderBS()}</div>
          <div className="border-t border-surface-200 pt-8"><h3 className="text-base font-semibold text-surface-900 mb-4">Cash Flow</h3>{renderCF()}</div>
          <div className="border-t border-surface-200 pt-8"><h3 className="text-base font-semibold text-surface-900 mb-4">Trial Balance</h3>{renderTB()}</div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card padding="lg">
        <div className="flex flex-wrap items-end gap-4 mb-6">
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
          <Button onClick={fetchData} loading={loading}>Run Report</Button>
          <Button onClick={handleDownload} loading={downloading} variant="secondary" className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </Button>
        </div>

        <div className="flex gap-1 border-b border-surface-200 mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                view === t.id
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : data ? (
          renderContent()
        ) : (
          <div className="text-center py-12">
            <p className="text-surface-400">Run a report to see results</p>
          </div>
        )}
      </Card>
    </div>
  );
}
