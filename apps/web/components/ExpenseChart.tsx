import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, ChartSkeleton } from '@/components/ui';

interface ChartData {
  month: string;
  expenses: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 text-white px-4 py-3 rounded-lg shadow-elevated text-sm">
      <p className="text-surface-300 mb-1">{label}</p>
      <p className="font-semibold text-red-400">${payload[0].value.toFixed(2)}</p>
    </div>
  );
}

export default function ExpenseChart({ userId }: { userId: string }) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/dashboard/trends?months=12&userId=' + encodeURIComponent(userId));
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (e) {
        console.error('Error fetching expense trend:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Card padding="md"><ChartSkeleton /></Card>;

  return (
    <Card padding="md">
      <h3 className="text-lg font-semibold text-surface-900 mb-6">Expenses Trend (12 Months)</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-surface-400">
          <p className="text-sm">No expense data</p>
        </div>
      )}
    </Card>
  );
}
