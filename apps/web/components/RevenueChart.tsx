import { memo, useEffect, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import { Card, ChartSkeleton, Button } from '@/components/ui';
import { formatCurrency } from '@/lib/format';

interface ChartData {
  month: string;
  revenue: number;
}

const CustomTooltip = memo(({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 text-white px-4 py-3 rounded-lg shadow-elevated text-sm">
      <p className="text-surface-300 mb-1">{label}</p>
      <p className="font-semibold text-emerald-400">{formatCurrency(payload[0].value ?? 0)}</p>
    </div>
  );
});

function csvDownload(data: ChartData[]) {
  const header = 'Month,Revenue\n';
  const rows = data.map(r => `${r.month},${r.revenue}`).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'revenue-trend.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default memo(function RevenueChart({ userId, months = 12, onMonthClick }: { userId: string; months?: number; onMonthClick?: (month: string) => void }) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/dashboard/trends?months=' + months + '&userId=' + encodeURIComponent(userId));
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setData(json.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading chart');
    } finally { setLoading(false); }
  }, [userId, months]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <Card padding="md"><ChartSkeleton /></Card>;

  if (error) return (
    <Card padding="md">
      <div className="flex flex-col items-center justify-center py-8 text-surface-400">
        <p className="text-sm text-red-500 mb-2">{error}</p>
        <Button size="sm" variant="secondary" onClick={fetchData}>Retry</Button>
      </div>
    </Card>
  );

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-surface-900">Revenue Trend ({months} Months)</h3>
        {data.length > 0 && (
          <button onClick={() => csvDownload(data)} className="text-xs text-primary-600 hover:text-primary-700 font-medium" title="Download CSV">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </button>
        )}
      </div>
      {data.length > 0 ? (
        <div className="h-[200px] sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} onClick={(e: any) => { if (onMonthClick && e?.activeLabel) onMonthClick(e.activeLabel); }} style={{ cursor: onMonthClick ? 'pointer' : 'default' }} />
          </AreaChart>
        </ResponsiveContainer>
        </div>
        ) : (
        <div className="flex flex-col items-center justify-center py-12 text-surface-400">
          <p className="text-sm">No revenue data</p>
        </div>
      )}
    </Card>
  );
});
