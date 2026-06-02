import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, ChartSkeleton } from '@/components/ui';
import { format, parseISO, subDays, startOfDay } from 'date-fns';

interface ExpenseChartProps {
  userId: string;
}

interface ChartData {
  date: string;
  expenses: number;
}

const ranges = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 text-white px-4 py-3 rounded-lg shadow-elevated text-sm">
      <p className="text-surface-300 mb-1">{label}</p>
      <p className="font-semibold">${payload[0].value.toFixed(2)}</p>
    </div>
  );
}

export default function ExpenseChart({ userId }: ExpenseChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const entriesRef = collection(db, 'ledger_entries');
        const q = query(entriesRef, where('userId', '==', userId), where('type', '==', 'expense'));
        const snapshot = await getDocs(q);

        const cutoff = startOfDay(subDays(new Date(), range));
        const dailyData: Record<string, number> = {};

        snapshot.forEach((doc) => {
          const entry = doc.data();
          if (!entry.date) return;
          const entryDate = parseISO(entry.date);
          if (entryDate < cutoff) return;
          if (!dailyData[entry.date]) dailyData[entry.date] = 0;
          dailyData[entry.date] += Math.abs(entry.amount);
        });

        const chartData = Object.entries(dailyData)
          .map(([date, expenses]) => ({ date, expenses }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setData(chartData);
      } catch (error) {
        console.error('Error fetching expense data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, range]);

  if (loading) return <Card padding="md"><ChartSkeleton /></Card>;

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-surface-900">Expenses Trend</h3>
        <div className="flex gap-1 bg-surface-100 rounded-lg p-0.5">
          {ranges.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                range === r.days
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => { try { return format(parseISO(v), 'MMM d'); } catch { return v; } }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="expenses"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-surface-400">
          <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 21.75h16.5" />
          </svg>
          <p className="text-sm font-medium">No expense data for this period</p>
        </div>
      )}
    </Card>
  );
}
