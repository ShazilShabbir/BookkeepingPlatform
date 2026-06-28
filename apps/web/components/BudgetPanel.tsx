import { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import toast from 'react-hot-toast';

interface BudgetItem {
  _id: string;
  accountCode: string;
  accountName: string;
  month: string;
  amount: number;
}

interface CategoryStat {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

interface MergedRow {
  accountCode?: string;
  category: string;
  budget: number;
  actual: number;
  budgetId?: string;
}

function getMonthStr(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function BudgetPanel({ userId }: { userId: string }) {
  const [month, setMonth] = useState(getMonthStr(new Date()));
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [actuals, setActuals] = useState<CategoryStat[]>([]);
  const [allAccounts, setAllAccounts] = useState<{ code: string; name: string }[]>([]);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [newAccountCode, setNewAccountCode] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [yr, mo] = month.split('-').map(Number);
      const eom = getDaysInMonth(yr, mo);
      const startDate = `${month}-01`;
      const endDate = `${month}-${eom}`;

      const [budgetRes, summaryRes, accountsRes] = await Promise.all([
        fetch(`/api/budget?month=${month}&userId=${encodeURIComponent(userId)}`),
        fetch(`/api/dashboard/summary?startDate=${startDate}&endDate=${endDate}&userId=${encodeURIComponent(userId)}`),
        fetch(`/api/accounts?userId=${encodeURIComponent(userId)}`),
      ]);

      const budgetJson = await budgetRes.json();
      const summaryJson = await summaryRes.json();
      const accountsJson = await accountsRes.json();

      if (budgetJson.success) setBudgets(budgetJson.data);
      if (summaryJson.success) {
        setActuals(summaryJson.data.expensesByCategory || []);
        if (summaryJson.data.baseCurrency) setBaseCurrency(summaryJson.data.baseCurrency);
      }
      if (accountsJson.success) setAllAccounts(accountsJson.data || []);
    } catch (e) {
      console.error('BudgetPanel fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [month, userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const accountMap = new Map(allAccounts.map(a => [a.code, a.name]));

  const budgetMap = new Map<string, BudgetItem>();
  for (const b of budgets) budgetMap.set(b.accountCode, b);

  const actualMap = new Map<string, number>();
  for (const a of actuals) actualMap.set(a.category, a.amount);

  const rows: MergedRow[] = [];

  for (const b of budgets) {
    const actual = actualMap.get(b.accountName) || 0;
    rows.push({ accountCode: b.accountCode, category: b.accountName, budget: b.amount, actual, budgetId: b._id });
    actualMap.delete(b.accountName);
  }

  for (const [cat, amount] of actualMap) {
    if (amount > 0) rows.push({ category: cat, budget: 0, actual: amount });
  }

  rows.sort((a, b) => Math.abs(b.budget) - Math.abs(a.budget));

  const saveBudget = async (accountCode: string, amount: number) => {
    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, accountCode, month, amount }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to save');
      toast.success('Budget saved');
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      const res = await fetch(`/api/budget/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to delete');
      toast.success('Budget removed');
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const unusedAccounts = allAccounts.filter(
    a => a.code !== '1000' && !budgetMap.has(a.code),
  );

  const prevMonth = () => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() - 1);
    setMonth(getMonthStr(d));
  };

  const nextMonth = () => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() + 1);
    setMonth(getMonthStr(d));
  };

  return (
    <Card padding="lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-surface-900">Budget vs Actual</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={prevMonth} aria-label="Previous month">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Button>
          <span className="text-sm font-semibold text-surface-700 min-w-[100px] text-center">{month}</span>
          <Button size="sm" variant="secondary" onClick={nextMonth} aria-label="Next month">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-surface-100 rounded animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-surface-400">
          <p className="text-sm">No budgets or expenses for this month.</p>
          <Button size="sm" className="mt-3" onClick={() => setAdding(true)}>Add Budget</Button>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                <th scope="col" className="text-left py-2 px-5 font-semibold text-surface-500 text-xs uppercase tracking-wider">Category</th>
                <th scope="col" className="text-right py-2 px-5 font-semibold text-surface-500 text-xs uppercase tracking-wider">Budget</th>
                <th scope="col" className="text-right py-2 px-5 font-semibold text-surface-500 text-xs uppercase tracking-wider">Actual</th>
                <th scope="col" className="text-right py-2 px-5 font-semibold text-surface-500 text-xs uppercase tracking-wider">Variance</th>
                <th scope="col" className="text-center py-2 px-5 font-semibold text-surface-500 text-xs uppercase tracking-wider">Used</th>
                <th scope="col" className="py-2 px-5 w-16" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const variance = row.budget - row.actual;
                const usedPct = row.budget > 0 ? Math.round((row.actual / row.budget) * 100) : 0;
                const overBudget = row.budget > 0 && row.actual > row.budget;
                const isEditing = editingId === row.budgetId;

                return (
                  <tr key={row.category + (row.accountCode || '')} className="border-b border-surface-100 hover:bg-surface-50/50">
                    <td className="py-2.5 px-5 text-surface-900 font-medium">{row.category}</td>
                    <td className="py-2.5 px-5 text-right">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="w-24 text-right border border-surface-200 rounded px-2 py-1 text-sm"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              saveBudget(row.accountCode || '', parseFloat(editValue) || 0);
                              setEditingId(null);
                            }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                      ) : (
                        <span className="text-surface-900">{formatCurrency(row.budget, baseCurrency)}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-5 text-right text-surface-900">{formatCurrency(row.actual, baseCurrency)}</td>
                    <td className={`py-2.5 px-5 text-right font-medium ${overBudget ? 'text-red-600' : variance >= 0 ? 'text-emerald-600' : 'text-surface-500'}`}>
                      {variance >= 0 ? '+' : ''}{formatCurrency(variance, baseCurrency)}
                    </td>
                    <td className="py-2.5 px-5 text-center">
                      {row.budget > 0 && (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-surface-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${overBudget ? 'bg-red-400' : usedPct > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(usedPct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${overBudget ? 'text-red-600' : 'text-surface-500'}`}>{usedPct}%</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-5">
                      <div className="flex items-center gap-1">
                        {row.budgetId && (
                          <>
                            <button
                              onClick={() => { setEditingId(row.budgetId!); setEditValue(String(row.budget)); }}
                              className="p-2.5 text-surface-400 hover:text-primary-600 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                              title="Edit budget"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={() => deleteBudget(row.budgetId!)}
                              className="p-2.5 text-surface-400 hover:text-red-600 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                              title="Remove budget"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <div className="mt-4 p-4 bg-surface-50 rounded-lg border border-surface-200 flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-surface-500 mb-1">Category</label>
            <select
              value={newAccountCode}
              onChange={e => setNewAccountCode(e.target.value)}
              className="w-full border border-surface-200 rounded-lg px-3 py-1.5 text-sm bg-white"
            >
              <option value="">Select category...</option>
              {unusedAccounts.map(a => (
                <option key={a.code} value={a.code}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-32">
            <label className="block text-xs font-medium text-surface-500 mb-1">Budget Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-surface-200 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={async () => {
              if (!newAccountCode || !newAmount) { toast.error('Select category and enter amount'); return; }
              await saveBudget(newAccountCode, parseFloat(newAmount) || 0);
              setAdding(false);
              setNewAccountCode('');
              setNewAmount('');
            }}>Add</Button>
            <Button size="sm" variant="secondary" onClick={() => { setAdding(false); setNewAccountCode(''); setNewAmount(''); }}>Cancel</Button>
          </div>
        </div>
      )}

      {!adding && rows.length > 0 && unusedAccounts.length > 0 && (
        <div className="mt-4">
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>+ Add Budget</Button>
        </div>
      )}
    </Card>
  );
}
