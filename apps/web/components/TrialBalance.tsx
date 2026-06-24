import { memo, useState, useCallback, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import { formatNumber } from '@/lib/format';

interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: string;
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
}

interface TrialBalanceData {
  rows: TrialBalanceRow[];
  totals: {
    totalDebits: number;
    totalCredits: number;
    difference: number;
    balanced: boolean;
  };
  dateRange: { startDate: string | null; endDate: string | null };
}

const ACCOUNT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'asset', label: 'Assets' },
  { value: 'liability', label: 'Liabilities' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expenses' },
];

export default memo(function TrialBalance() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [data, setData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(false);

  const runTrialBalance = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch(`/api/reports/trial-balance?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load trial balance');
      setData(json.data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, typeFilter]);

  useEffect(() => { runTrialBalance(); }, [runTrialBalance]);

  return (
    <Card padding="lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-primary-50 text-primary-600">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-surface-900">Trial Balance</h2>
          <p className="text-sm text-surface-500">Verify debits equal credits across all accounts</p>
        </div>
      </div>

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
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Account Type</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm bg-white min-w-[140px]">
            {ACCOUNT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <Button onClick={runTrialBalance} loading={loading}>
          Run Trial Balance
        </Button>
      </div>

      {data && (
        <div className="space-y-4">
          {data.rows.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-8">No journal entries found for the selected period</p>
          ) : (
            <>
              <div className="overflow-x-auto border border-surface-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-100">
                      <th className="py-2.5 px-4 text-left font-medium text-surface-600">Code</th>
                      <th className="py-2.5 px-4 text-left font-medium text-surface-600">Account</th>
                      <th className="py-2.5 px-4 text-left font-medium text-surface-600">Type</th>
                      <th className="py-2.5 px-4 text-right font-medium text-surface-600">Debits</th>
                      <th className="py-2.5 px-4 text-right font-medium text-surface-600">Credits</th>
                      <th className="py-2.5 px-4 text-right font-medium text-surface-600">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map(row => (
                      <tr key={row.accountCode} className="border-t border-surface-100 hover:bg-surface-50">
                        <td className="py-2 px-4 font-mono text-surface-500">{row.accountCode}</td>
                        <td className="py-2 px-4 font-medium text-surface-900">{row.accountName}</td>
                        <td className="py-2 px-4">
                          <Badge variant={
                            row.accountType === 'asset' ? 'primary' :
                            row.accountType === 'liability' ? 'warning' :
                            row.accountType === 'equity' ? 'info' :
                            row.accountType === 'revenue' ? 'success' : 'danger'
                          } size="sm">{row.accountType}</Badge>
                        </td>
                        <td className="py-2 px-4 text-right font-mono text-surface-700">{formatNumber(row.totalDebits)}</td>
                        <td className="py-2 px-4 text-right font-mono text-surface-700">{formatNumber(row.totalCredits)}</td>
                        <td className={`py-2 px-4 text-right font-mono font-medium ${
                          row.netBalance >= 0 ? 'text-surface-900' : 'text-red-600'
                        }`}>
                          {formatNumber(row.netBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-surface-300 bg-surface-50 font-semibold">
                      <td className="py-3 px-4 text-surface-700" colSpan={3}>Totals</td>
                      <td className="py-3 px-4 text-right font-mono text-surface-900">{formatNumber(data.totals.totalDebits)}</td>
                      <td className="py-3 px-4 text-right font-mono text-surface-900">{formatNumber(data.totals.totalCredits)}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {data.totals.balanced ? (
                          <span className="text-emerald-600">Balanced</span>
                        ) : (
                          <span className="text-red-600">Diff: {formatNumber(data.totals.difference)}</span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {!data.totals.balanced && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">
                  <strong>Trial balance is out of balance!</strong> Total debits (${formatNumber(data.totals.totalDebits)}) 
                  {' '}do not equal total credits (${formatNumber(data.totals.totalCredits)}).
                  {' '}Difference: ${formatNumber(data.totals.difference)}.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
});
