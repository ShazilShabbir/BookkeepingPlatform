import { Card } from '@/components/ui';
import { formatCurrency } from '@/lib/format';

interface CategoryStat {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

function CategoryBar({ label, amount, percentage, color }: { label: string; amount: number; percentage: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-700 truncate flex-1">{label}</span>
        <span className="text-surface-900 font-medium ml-2">{formatCurrency(amount)}</span>
      </div>
      <div className="w-full bg-surface-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  );
}

export default function TopCategories({ revenueByCategory, expensesByCategory }: { revenueByCategory: CategoryStat[]; expensesByCategory: CategoryStat[] }) {
  const topRev = revenueByCategory.slice(0, 5);
  const topExp = expensesByCategory.slice(0, 5);

  if (topRev.length === 0 && topExp.length === 0) {
    return (
      <Card padding="md">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Top Categories</h3>
        <div className="flex flex-col items-center justify-center py-8 text-surface-400">
          <p className="text-sm">No category data</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <h3 className="text-lg font-semibold text-surface-900 mb-4">Top Categories</h3>
      <div className="space-y-5">
        {topRev.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Top Revenue</h4>
            <div className="space-y-2.5">
              {topRev.map(c => (
                <CategoryBar key={c.category} label={c.category} amount={c.amount} percentage={c.percentage} color="bg-emerald-400" />
              ))}
            </div>
          </div>
        )}
        {topExp.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Top Expenses</h4>
            <div className="space-y-2.5">
              {topExp.map(c => (
                <CategoryBar key={c.category} label={c.category} amount={c.amount} percentage={c.percentage} color="bg-red-400" />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
