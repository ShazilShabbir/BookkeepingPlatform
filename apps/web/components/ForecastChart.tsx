import { useEffect, useState, memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { TooltipProps } from 'recharts';
import { Card, Button, ChartSkeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { linearRegression, nextMonthLabels } from '@/lib/forecast';

interface ChartPoint {
  month: string;
  actual?: number;
  forecast?: number;
}

const CustomTooltip = memo(({ active, payload, label, currency }: TooltipProps<number, string> & { currency?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 text-white px-4 py-3 rounded-lg shadow-elevated text-sm">
      <p className="text-surface-300 mb-1">{label}</p>
      {payload.map((p, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>{p.name}: {p.value != null ? formatCurrency(p.value, currency) : 'N/A'}</p>
      ))}
    </div>
  );
});

function csvDownload(data: ChartPoint[]) {
  const header = 'Month,Actual,Forecast\n';
  const rows = data.map(r => `${r.month},${r.actual ?? ''},${r.forecast ?? ''}`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'forecast.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default memo(function ForecastChart({ userId, startDate, endDate, onMonthClick }: { userId: string; startDate?: string; endDate?: string; onMonthClick?: (month: string) => void }) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [baseCurrency, setBaseCurrency] = useState('USD');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); setError('');
      try {
        const params = new URLSearchParams({ userId });
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (!startDate && !endDate) params.set('months', '12');
        const res = await fetch('/api/dashboard/trends?' + params.toString());
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load');
        if (json.baseCurrency) setBaseCurrency(json.baseCurrency);
        const all = json.data as { month: string; revenue: number; expenses: number; profit: number }[];
        if (all.length < 2) { setData([]); return; }

        const values = all.map(d => d.profit);
        const { projected } = linearRegression(values, 3);
        const lastMonth = all[all.length - 1]?.month || '';
        const forecastLabels = /^\d{4}-\d{2}$/.test(lastMonth) ? nextMonthLabels(lastMonth, 3) : [];

        setData([
          ...all.map((d, i) => ({ month: d.month.slice(-2), actual: values[i] })),
          ...forecastLabels.map((m, i) => ({ month: m.slice(-2), forecast: projected[i] })),
        ]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error loading forecast');
      } finally { setLoading(false); }
    };
    fetchData();
  }, [userId, startDate, endDate, retryKey]);

  if (loading) return <Card padding="md"><ChartSkeleton /></Card>;

  if (error) return (
    <Card padding="md">
      <div className="flex flex-col items-center justify-center py-8 text-surface-400">
        <p className="text-sm text-red-500 mb-2">{error}</p>
        <Button size="sm" variant="secondary" onClick={() => setRetryKey(k => k + 1)}>Retry</Button>
      </div>
    </Card>
  );

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-surface-900">Net Profit Forecast (3 Months)</h3>
        {data.length > 0 && (
          <button onClick={() => csvDownload(data)} className="text-xs text-primary-600 hover:text-primary-700" title="Download CSV">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </button>
        )}
      </div>
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-surface-400"><p className="text-sm">Not enough data for forecast</p></div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v, baseCurrency)} />
              <Tooltip content={<CustomTooltip currency={baseCurrency} />} />
              <Legend iconType="line" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke="#6366f1" strokeWidth={2} dot={false} connectNulls onClick={(e: any) => { if (onMonthClick && e?.activeLabel) onMonthClick(e.activeLabel); }} style={{ cursor: onMonthClick ? 'pointer' : 'default' }} />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#6366f1" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls onClick={(e: any) => { if (onMonthClick && e?.activeLabel) onMonthClick(e.activeLabel); }} style={{ cursor: onMonthClick ? 'pointer' : 'default' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
});
