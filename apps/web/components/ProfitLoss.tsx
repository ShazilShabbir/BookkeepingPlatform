import { memo, useState, useCallback, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/format';

interface AccountBalance {
  accountCode: string;
  accountName: string;
  balance: number;
}

interface StatementSection {
  title: string;
  type: string;
  total: number;
  accounts: AccountBalance[];
}

interface ProfitLossData {
  title: string;
  dateRange: { startDate: string | null; endDate: string | null };
  sections: StatementSection[];
  netIncome: number;
  netIncomeRatio: number;
}

export default memo(function ProfitLoss() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState('USD');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'profit-loss' });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/reports/financial-statements?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load P&L');
      setData(json.data);
      if (json.data?.baseCurrency) setBaseCurrency(json.data.baseCurrency);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load P&L');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Card padding="lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-surface-900">Profit & Loss Statement</h2>
          <p className="text-sm text-surface-500">Revenue and expenses over a period</p>
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
        <Button onClick={fetchData} loading={loading}>
          Run Report
        </Button>
      </div>

      {data && (
        <div className="space-y-6">
          {data.sections.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-8">No data found for the selected period</p>
          ) : (
            <>
              {data.sections.map(section => (
                <div key={section.type}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-surface-900">{section.title}</h3>
                    <span className="text-lg font-bold text-surface-900">{formatCurrency(section.total, baseCurrency)}</span>
                  </div>
                  <div className="overflow-x-auto border border-surface-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-100">
                          <th scope="col" className="py-2 px-4 text-left font-medium text-surface-600">Account</th>
                          <th scope="col" className="py-2 px-4 text-right font-medium text-surface-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.accounts.map(acc => (
                          <tr key={acc.accountCode} className="border-t border-surface-100 hover:bg-surface-50">
                            <td className="py-2 px-4">
                              <span className="font-mono text-surface-400 mr-2">{acc.accountCode}</span>
                              <span className="text-surface-900">{acc.accountName}</span>
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-medium text-surface-900">
                              {formatCurrency(acc.balance, baseCurrency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div className="p-5 bg-surface-50 rounded-xl border border-surface-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-surface-700">Net Income</p>
                    <p className="text-xs text-surface-400">
                      Revenue − Expenses
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(data.netIncome, baseCurrency)}
                    </p>
                    <p className="text-sm text-surface-500">
                      Margin: <span className="font-semibold">{data.netIncomeRatio}%</span>
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
});
