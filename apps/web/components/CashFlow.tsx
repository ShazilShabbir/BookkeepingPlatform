import { useState, useCallback, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';

interface CashFlowItem {
  accountCode: string;
  accountName: string;
  amount: number;
}

interface CashFlowSection {
  title: string;
  items: CashFlowItem[];
  total: number;
}

interface CashFlowData {
  sections: CashFlowSection[];
  totalChange: number;
  dateRange: { startDate: string | null; endDate: string | null };
}

export default function CashFlow() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/reports/cash-flow?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load cash flow');
      setData(json.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load cash flow');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, []);

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <Card padding="lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75l.75.75m0 0l.75-.75m-.75.75V21" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-surface-900">Cash Flow Statement</h2>
          <p className="text-sm text-surface-500">Cash inflows and outflows over a period</p>
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
          {data.sections.every(s => s.items.length === 0) ? (
            <p className="text-sm text-surface-400 text-center py-8">No cash flow data for the selected period</p>
          ) : (
            <>
              {data.sections.map(section => (
                <div key={section.title}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-surface-900">{section.title}</h3>
                    <span className={`text-lg font-bold ${section.total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmt(section.total)}
                    </span>
                  </div>
                  <div className="overflow-x-auto border border-surface-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-100">
                          <th className="py-2 px-4 text-left font-medium text-surface-600">Account</th>
                          <th className="py-2 px-4 text-right font-medium text-surface-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.items.map(item => (
                          <tr key={item.accountCode} className="border-t border-surface-100 hover:bg-surface-50">
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

              <div className="p-5 bg-surface-50 rounded-xl border border-surface-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-surface-700">Net Change in Cash</p>
                    <p className="text-xs text-surface-400">
                      Operating + Investing + Financing
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${data.totalChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmt(data.totalChange)}
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
}
