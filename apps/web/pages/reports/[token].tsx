import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';

type ReportData = {
  clientName: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  entryCount: number;
  topCategories: { category: string; amount: number; count: number }[];
};

export default function PublicReport() {
  const router = useRouter();
  const { token } = router.query;
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public-report?token=${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error || 'Invalid link');
      })
      .catch(() => setError('Failed to load report'))
      .finally(() => setLoading(false));
  }, [token]);

  const currency = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Card padding="lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-surface-900">Financial Report</h1>
            <p className="text-surface-500 mt-1">Prepared for {data.clientName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-50 rounded-lg p-4 text-center">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Revenue</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{currency(data.totalRevenue)}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-4 text-center">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Expenses</p>
              <p className="text-xl font-bold text-red-500 mt-1">{currency(data.totalExpenses)}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-4 text-center">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Net Profit</p>
              <p className={`text-xl font-bold mt-1 ${data.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {currency(data.netProfit)}
              </p>
            </div>
            <div className="bg-surface-50 rounded-lg p-4 text-center">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Profit Margin</p>
              <p className="text-xl font-bold text-primary-600 mt-1">{data.profitMargin.toFixed(1)}%</p>
            </div>
          </div>

          <div className="bg-surface-50 rounded-lg p-4 text-center mb-6">
            <p className="text-xs text-surface-500 uppercase tracking-wider">Total Entries</p>
            <p className="text-lg font-semibold text-surface-900 mt-1">{data.entryCount}</p>
          </div>

          {data.topCategories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-surface-700 mb-3">Top Categories</h3>
              <div className="space-y-2">
                {data.topCategories.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between bg-surface-50 rounded-lg px-4 py-2.5">
                    <span className="text-sm font-medium text-surface-700 capitalize">{cat.category}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-surface-400">{cat.count} entries</span>
                      <span className="text-sm font-semibold text-surface-900">{currency(cat.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-surface-400 mt-8">
            Generated by Bookkeeping Platform
          </p>
        </Card>
      </div>
    </div>
  );
}
