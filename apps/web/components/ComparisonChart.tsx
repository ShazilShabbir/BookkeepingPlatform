import { useEffect, useState, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { TooltipProps } from 'recharts';
import { Card, Button, ChartSkeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/format';

interface ChartData {
  month: string;
  current: number;
  previous: number;
}

const CustomTooltip = memo(({ active, payload, label, currency }: TooltipProps<number, string> & { currency?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 text-white px-4 py-3 rounded-lg shadow-elevated text-sm">
      <p className="text-surface-300 mb-1">{label}</p>
      {payload.map((p, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>{p.name}: {formatCurrency(p.value ?? 0, currency)}</p>
      ))}
    </div>
  );
});

function csvDownload(data: ChartData[], mode: string) {
  const header = 'Month,Current,Previous\n';
  const rows = data.map(r => `${r.month},${r.current},${r.previous}`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `profit-comparison-${mode}.csv`; a.click();
  URL.revokeObjectURL(url);
}

type Mode = 'mom' | 'yoy';

export default memo(function ComparisonChart({ userId, startDate, endDate, onMonthClick }: { userId: string; startDate?: string; endDate?: string; onMonthClick?: (month: string) => void }) {
  const [mode, setMode] = useState<Mode>('yoy');
  const [data, setData] = useState<ChartData[]>([]);
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
        if (!startDate && !endDate) params.set('months', String(mode === 'yoy' ? 24 : 2));
        const res = await fetch('/api/dashboard/trends?' + params.toString());
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load');
        if (json.baseCurrency) setBaseCurrency(json.baseCurrency);
        const all = json.data as { month: string; revenue: number; expenses: number }[];

        if (mode === 'yoy') {
          const half = Math.floor(all.length / 2);
          if (half < 1) { setData([]); return; }
          const prevYear = all.slice(0, half);
          const currYear = all.slice(half);
          const len = Math.min(prevYear.length, currYear.length);
          setData(currYear.slice(0, len).map((c, i) => ({
            month: c.month.slice(-2),
            current: Math.round((c.revenue - c.expenses) * 100) / 100,
            previous: Math.round(((prevYear[i]?.revenue || 0) - (prevYear[i]?.expenses || 0)) * 100) / 100,
          })));
        } else {
          if (all.length < 2) { setData([]); return; }
          const curr = all[all.length - 1];
          const prev = all[all.length - 2];
          setData([{
            month: 'This Month',
            current: Math.round(((curr?.revenue || 0) - (curr?.expenses || 0)) * 100) / 100,
            previous: Math.round(((prev?.revenue || 0) - (prev?.expenses || 0)) * 100) / 100,
          }]);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error loading chart');
      } finally { setLoading(false); }
    };
    fetchData();
  }, [userId, mode, startDate, endDate, retryKey]);

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
        <h3 className="text-lg font-semibold text-surface-900">Profit Comparison</h3>
        <div className="flex items-center gap-2">
          {data.length > 0 && (
            <button onClick={() => csvDownload(data, mode)} className="text-xs text-primary-600 hover:text-primary-700" title="Download CSV">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </button>
          )}
          <div className="flex gap-1">
            <Button size="sm" variant={mode === 'mom' ? 'primary' : 'secondary'} onClick={() => setMode('mom')}>MoM</Button>
            <Button size="sm" variant={mode === 'yoy' ? 'primary' : 'secondary'} onClick={() => setMode('yoy')}>YoY</Button>
          </div>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-surface-400"><p className="text-sm">No data</p></div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v, baseCurrency)} />
              <Tooltip content={<CustomTooltip currency={baseCurrency} />} />
              <Legend iconType="rect" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="current" name={mode === 'yoy' ? 'This Year' : 'This Month'} fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={mode === 'mom' ? 60 : 24} onClick={(e: any) => { if (onMonthClick && e?.activeLabel) onMonthClick(e.activeLabel); }} style={{ cursor: onMonthClick ? 'pointer' : 'default' }} />
              <Bar dataKey="previous" name={mode === 'yoy' ? 'Last Year' : 'Last Month'} fill="#a5b4fc" radius={[4, 4, 0, 0]} maxBarSize={mode === 'mom' ? 60 : 24} onClick={(e: any) => { if (onMonthClick && e?.activeLabel) onMonthClick(e.activeLabel); }} style={{ cursor: onMonthClick ? 'pointer' : 'default' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
});
