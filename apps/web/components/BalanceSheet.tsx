import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';

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

interface BalanceSheetData {
  title: string;
  dateRange: { asOfDate: string | null };
  sections: StatementSection[];
}

export default function BalanceSheet() {
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'balance-sheet', endDate: asOfDate });
      const res = await fetch(`/api/reports/financial-statements?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load balance sheet');
      setData(json.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load balance sheet');
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => { fetchData(); }, []);

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <Card padding="lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-surface-900">Balance Sheet</h2>
          <p className="text-sm text-surface-500">Assets, liabilities, and equity at a point in time</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">As of Date</label>
          <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)}
            className="border border-surface-200 rounded-lg px-3 py-1.5 text-sm bg-white" />
        </div>
        <Button onClick={fetchData} loading={loading}>
          Run Report
        </Button>
      </div>

      {data && (
        <div className="space-y-6">
          {data.sections.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-8">No data found</p>
          ) : (
            <>
              {data.sections.map(section => (
                <div key={section.type}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-surface-900">{section.title}</h3>
                    <span className="text-lg font-bold text-surface-900">{fmt(section.total)}</span>
                  </div>
                  <div className="overflow-x-auto border border-surface-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-100">
                          <th className="py-2 px-4 text-left font-medium text-surface-600">Account</th>
                          <th className="py-2 px-4 text-right font-medium text-surface-600">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.accounts.map(acc => (
                          <tr key={acc.accountCode} className={`border-t border-surface-100 hover:bg-surface-50 ${acc.accountCode === 'net-income' ? 'bg-surface-50 font-medium' : ''}`}>
                            <td className="py-2 px-4">
                              <span className={`font-mono ${acc.accountCode === 'net-income' ? 'text-surface-400' : 'text-surface-400'} mr-2`}>
                                {acc.accountCode === 'net-income' ? '' : acc.accountCode}
                              </span>
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
                </div>
              ))}

              <div className="p-5 bg-surface-50 rounded-xl border border-surface-200">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Total Assets</p>
                    <p className="text-xl font-bold text-primary-600 mt-1">
                      {fmt(data.sections.find(s => s.type === 'asset')?.total || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Total Liabilities</p>
                    <p className="text-xl font-bold text-amber-600 mt-1">
                      {fmt(data.sections.find(s => s.type === 'liability')?.total || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">Total Equity</p>
                    <p className="text-xl font-bold text-emerald-600 mt-1">
                      {fmt(data.sections.find(s => s.type === 'equity')?.total || 0)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-surface-200 text-center">
                  <p className="text-xs text-surface-400">
                    Assets = Liabilities + Equity
                    {' '}
                    {(() => {
                      const assets = data.sections.find(s => s.type === 'asset')?.total || 0;
                      const liabilities = data.sections.find(s => s.type === 'liability')?.total || 0;
                      const equity = data.sections.find(s => s.type === 'equity')?.total || 0;
                      const diff = Math.abs(assets - (liabilities + equity));
                      return diff < 0.01
                        ? <span className="text-emerald-600 font-medium">✓ Balanced</span>
                        : <span className="text-red-600 font-medium">⚠ Off by {fmt(diff)}</span>;
                    })()}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
