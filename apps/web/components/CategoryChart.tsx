import { memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { TooltipProps } from 'recharts';
import { Card } from '@/components/ui';
import { formatCurrency } from '@/lib/format';

interface CategoryStat {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#84cc16'];

const CustomTooltip = memo(({ active, payload, baseCurrency }: TooltipProps<number, string> & { baseCurrency?: string }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface-800 text-white px-4 py-3 rounded-lg shadow-elevated text-sm">
      <p className="text-surface-300 mb-1">{d.category}</p>
      <p className="font-semibold">{formatCurrency(d.amount, baseCurrency)}</p>
      <p className="text-surface-400 text-xs">{d.percentage}% of expenses</p>
    </div>
  );
});

export default memo(function CategoryChart({ data, title = 'Expenses by Category', onCategoryClick, baseCurrency = 'USD' }: { data: CategoryStat[]; title?: string; onCategoryClick?: (category: string) => void; baseCurrency?: string }) {
  if (!data || data.length === 0) {
    return (
      <Card padding="md">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-8 text-surface-400">
          <p className="text-sm">No category data</p>
        </div>
      </Card>
  );
}

  const chartData = data.filter(d => d.amount > 0);
  if (chartData.length === 0) {
    return (
      <Card padding="md">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-8 text-surface-400">
          <p className="text-sm">No category data</p>
        </div>
      </Card>
  );
}

  return (
    <Card padding="md">
      <h3 className="text-lg font-semibold text-surface-900 mb-4">{title}</h3>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="h-[200px] w-full sm:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {chartData.map((item, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} onClick={() => { if (onCategoryClick) onCategoryClick(item.category); }} style={{ cursor: onCategoryClick ? 'pointer' : 'default' }} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip baseCurrency={baseCurrency} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full sm:w-1/2 space-y-1.5">
          {chartData.slice(0, 6).map((item, i) => (
            <div key={item.category} className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-surface-700 truncate flex-1">{item.category}</span>
              <span className="text-surface-500 text-xs">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
});
