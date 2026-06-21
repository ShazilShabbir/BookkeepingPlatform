import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/format';

interface AccountOption {
  code: string;
  name: string;
  type: string;
}

interface JournalLineData {
  _id: string;
  accountCode: string;
  description: string;
  debit: number;
  credit: number;
}

interface JournalEntryData {
  _id: string;
  userId: string;
  date: string;
  description: string;
  customFieldValues?: Record<string, any>;
  lines: JournalLineData[];
}

interface SearchResponse {
  success: boolean;
  data: JournalEntryData[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

interface DisplayEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  lineCount: number;
  lines: JournalLineData[];
  customFieldValues?: Record<string, any>;
}

interface CustomFieldDef {
  id: string;
  label: string;
  type: string;
}

export default function SearchEntries({ userId, customerUid }: { userId: string; customerUid?: string }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: '', description: '' });
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!customerUid) return;
    (async () => {
      try {
        const res = await fetch(`/api/customers?uid=${encodeURIComponent(customerUid)}`);
        const json = await res.json();
        if (json.success && json.data?.customFields) setCustomFieldDefs(json.data.customFields);
      } catch {}
    })();
  }, [customerUid]);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await fetch('/api/accounts?userId=' + encodeURIComponent(userId));
        const json = await res.json();
        if (json.success) setAccounts(json.data || []);
      } catch {}
    };
    loadAccounts();
  }, [userId]);

  const accountTypeMap = new Map(accounts.map(a => [a.code, a.type]));

  const toDisplayEntry = (entry: JournalEntryData): DisplayEntry => {
    let totalDebit = 0;
    let totalCredit = 0;
    const codes = new Set<string>();
    for (const line of entry.lines) {
      totalDebit += line.debit || 0;
      totalCredit += line.credit || 0;
      if (line.accountCode) codes.add(line.accountCode);
    }

    const types = new Set<string>();
    for (const code of codes) {
      const t = accountTypeMap.get(code);
      if (t) types.add(t);
    }

    const isExpense = types.has('expense') && !types.has('revenue');
    const amount = Math.max(totalDebit, totalCredit);
    const cat = entry.lines.map(l => l.accountCode).filter(Boolean).join(', ') || 'Uncategorized';

    return {
      id: entry._id,
      date: entry.date,
      description: entry.description,
      amount: isExpense ? -amount : amount,
      type: isExpense ? 'expense' : 'income',
      category: cat,
      lineCount: entry.lines.length,
      lines: entry.lines,
      customFieldValues: entry.customFieldValues,
    };
  };

  const doSearch = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const currentPage = append ? page + 1 : 1;
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (typeFilter) params.set('type', typeFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (userId) params.set('userId', userId);
      params.set('page', String(page));
      params.set('pageSize', '50');

      const res = await fetch(`/api/entries/search?${params.toString()}`);
      const json: SearchResponse = await res.json();
      if (!json.success) throw new Error('Search failed');

      const mapped = json.data.map(toDisplayEntry);
      setEntries(prev => append ? [...prev, ...mapped] : mapped);
      setHasMore(json.hasMore);
      setPage(currentPage);
      setTotal(json.total);
      setSearched(true);
    } catch (err: any) {
      toast.error(err.message || 'Search failed');
      if (!append) setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter, startDate, endDate, page, accounts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setEntries([]);
    doSearch(false);
  };

  const loadMore = () => {
    if (hasMore && !loading) doSearch(true);
  };

  const clearFilters = () => {
    setQuery('');
    setTypeFilter('');
    setStartDate('');
    setEndDate('');
    setEntries([]);
    setPage(1);
    setHasMore(false);
    setTotal(0);
    setSearched(false);
    setExpandedRow(null);
    setEditingId(null);
    setEditForm({ date: '', description: '' });
    if (inputRef.current) inputRef.current.focus();
  };

  const startEdit = (entry: DisplayEntry) => {
    setEditingId(entry.id);
    setEditForm({ date: entry.date, description: entry.description });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ date: '', description: '' });
  };

  const saveEdit = async (entryId: string) => {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (editForm.date) body.date = editForm.date;
      if (editForm.description) body.description = editForm.description;
      const res = await fetch(`/api/entries/${entryId}?userId=${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Save failed');
      toast.success('Entry updated');
      setEntries(prev => prev.map(e => {
        if (e.id !== entryId) return e;
        return { ...e, date: editForm.date || e.date, description: editForm.description || e.description };
      }));
      cancelEdit();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry: DisplayEntry) => {
    if (!confirm('Delete this entry? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/entries/${entry.id}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Delete failed');
      toast.success('Entry deleted');
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      setTotal(prev => prev - 1);
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const formatAmount = (val: number, currency = 'USD') => {
    const abs = formatCurrency(Math.abs(val), currency);
    return val < 0 ? `-${abs}` : abs;
  };

  return (
    <div className="space-y-6">
      <Card padding="md">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search descriptions, account codes, or account names..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-surface-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full sm:w-auto text-sm border border-surface-200 rounded-lg px-3 py-2 bg-white text-surface-700"
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs text-surface-500 shrink-0">From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="flex-1 sm:flex-none text-sm border border-surface-200 rounded-lg px-3 py-2 bg-white text-surface-700" />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs text-surface-500 shrink-0">To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="flex-1 sm:flex-none text-sm border border-surface-200 rounded-lg px-3 py-2 bg-white text-surface-700" />
            </div>
            {searched && (
              <button type="button" onClick={clearFilters} className="text-xs text-primary-600 hover:underline self-center ml-auto">
                Clear filters
              </button>
            )}
          </div>
        </form>
      </Card>

      {loading && entries.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && searched && entries.length === 0 && (
        <div className="text-center py-16 text-surface-400">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm font-medium">No results found</p>
          <p className="text-xs mt-1">Try a different search term or adjust your filters</p>
        </div>
      )}

      {entries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-surface-500">
              Showing {entries.length} of {total} result{total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-2">
            {entries.map(entry => (
              <div key={entry.id} className="bg-white rounded-lg border border-surface-200 overflow-hidden">
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-surface-50 transition-colors"
                  onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                >
                  <div className="w-20 shrink-0 text-sm text-surface-600 font-mono">{entry.date}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-900 truncate">{entry.description}</div>
                    <div className="text-xs text-surface-400">{entry.lineCount} line{entry.lineCount !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-semibold ${entry.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatAmount(entry.amount)}
                    </div>
                    <Badge variant={entry.type === 'income' ? 'success' : 'danger'} size="sm">{entry.type}</Badge>
                  </div>
                  <svg className={`w-4 h-4 text-surface-400 transition-transform ${expandedRow === entry.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {expandedRow === entry.id && (
                  <div className="px-4 pb-3 pt-1 border-t border-surface-100 bg-surface-50/50">
                    {editingId === entry.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-surface-500 block mb-1">Date</label>
                            <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                              className="w-full text-sm border border-surface-200 rounded-lg px-3 py-2 bg-white" />
                          </div>
                          <div>
                            <label className="text-xs text-surface-500 block mb-1">Description</label>
                            <input type="text" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                              className="w-full text-sm border border-surface-200 rounded-lg px-3 py-2 bg-white" />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => saveEdit(entry.id)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                          <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="overflow-x-auto border border-surface-200 rounded-lg">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-surface-100">
                                <th className="py-1.5 px-3 text-left font-medium text-surface-600">Account</th>
                                <th className="py-1.5 px-3 text-left font-medium text-surface-600">Description</th>
                                <th className="py-1.5 px-3 text-right font-medium text-surface-600">Debit</th>
                                <th className="py-1.5 px-3 text-right font-medium text-surface-600">Credit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entry.lines.map(line => (
                                <tr key={line._id} className="border-t border-surface-100">
                                  <td className="py-1.5 px-3 font-mono text-surface-500">{line.accountCode || '—'}</td>
                                  <td className="py-1.5 px-3 text-surface-700">{line.description || '—'}</td>
                                  <td className="py-1.5 px-3 text-right font-mono text-surface-700">{(line.debit || 0).toFixed(2)}</td>
                                  <td className="py-1.5 px-3 text-right font-mono text-surface-700">{(line.credit || 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {entry.customFieldValues && Object.keys(entry.customFieldValues).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(entry.customFieldValues).map(([fieldId, val]) => {
                              const def = customFieldDefs.find(d => d.id === fieldId);
                              const typeColors: Record<string, string> = {
                                text: 'bg-blue-50 text-blue-700 border-blue-200',
                                number: 'bg-amber-50 text-amber-700 border-amber-200',
                                date: 'bg-purple-50 text-purple-700 border-purple-200',
                                boolean: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                              };
                              const color = typeColors[def?.type || 'text'] || typeColors.text;
                              return (
                                <span key={fieldId} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${color}`}>
                                  <span className="opacity-70">{def?.label || fieldId}:</span>
                                  <span>{String(val)}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(entry)}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteEntry(entry)} className="text-red-600 hover:text-red-700">Delete</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-6">
              <Button type="button" variant="secondary" onClick={loadMore} disabled={loading}>
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
