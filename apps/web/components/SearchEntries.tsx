import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';

interface AccountOption {
  code: string;
  name: string;
  type: string;
}

interface RawDataEntry {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: string;
  note?: string;
  source: string;
  matchedFields: string[];
  rawData: Record<string, string>;
  importedAt?: string;
}

interface SearchResponse {
  entries: RawDataEntry[];
  hasMore: boolean;
  cursor: string | null;
  totalRead: number;
  totalReturned: number;
}

export default function SearchEntries({ userId }: { userId: string }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entries, setEntries] = useState<RawDataEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [totalRead, setTotalRead] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ date: '', description: '', accountCode: '', accountName: '', accountType: '' });
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await fetch('/api/accounts');
        const json = await res.json();
        if (json.success) setAccounts(json.data || []);
      } catch {}
    };
    loadAccounts();
  }, []);

  const startEdit = (entry: RawDataEntry) => {
    setEditingId(entry.id);
    setEditForm({
      date: entry.date,
      description: entry.description,
      accountCode: '',
      accountName: '',
      accountType: '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ date: '', description: '', accountCode: '', accountName: '', accountType: '' });
  };

  const saveEdit = async (entryId: string) => {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (editForm.date) body.date = editForm.date;
      if (editForm.description) body.description = editForm.description;
      if (editForm.accountCode) {
        body.accountCode = editForm.accountCode;
        body.accountName = editForm.accountName;
        body.accountType = editForm.accountType;
      }
      const res = await fetch(`/api/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Save failed');
      toast.success('Entry updated');
      setEntries(prev => prev.map(e => {
        if (e.id !== entryId) return e;
        return {
          ...e,
          date: editForm.date || e.date,
          description: editForm.description || e.description,
        };
      }));
      cancelEdit();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const doSearch = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const res = await fetch('/api/entries/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          query: query.trim(),
          type: typeFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          pageSize: 50,
          cursor: append ? cursor : null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Search failed');

      const data: SearchResponse = json.data;
      setEntries(prev => append ? [...prev, ...data.entries] : data.entries);
      setHasMore(data.hasMore);
      setCursor(data.cursor);
      setTotalRead(prev => append ? prev + data.totalRead : data.totalRead);
      setSearched(true);
    } catch (err: any) {
      toast.error(err.message || 'Search failed');
      if (!append) setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [userId, query, typeFilter, startDate, endDate, cursor]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCursor(null);
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
    setCursor(null);
    setHasMore(false);
    setTotalRead(0);
    setSearched(false);
    setExpandedRow(null);
    setEditingId(null);
    setEditForm({ date: '', description: '', accountCode: '', accountName: '', accountType: '' });
    if (inputRef.current) inputRef.current.focus();
  };

  const formatAmount = (val: number) => {
    const abs = Math.abs(val).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    return val < 0 ? `-${abs}` : abs;
  };

  return (
    <div className="space-y-6">
      <Card padding="md">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search across all fields including raw CSV data..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-surface-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="text-sm border border-surface-200 rounded-lg px-3 py-2 bg-white text-surface-700"
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-surface-500">From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="text-sm border border-surface-200 rounded-lg px-3 py-2 bg-white text-surface-700" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-surface-500">To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="text-sm border border-surface-200 rounded-lg px-3 py-2 bg-white text-surface-700" />
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
              {entries.length} result{entries.length !== 1 ? 's' : ''}
              {totalRead > 0 && <span className="text-surface-400"> (scanned {totalRead} entries)</span>}
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
                    {entry.matchedFields.length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {entry.matchedFields.map(f => (
                          <span key={f} className="text-[10px] bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded">{f}</span>
                        ))}
                      </div>
                    )}
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
                        <div className="grid grid-cols-2 gap-3">
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
                        <div>
                          <label className="text-xs text-surface-500 block mb-1">Account</label>
                          <select value={editForm.accountCode} onChange={e => {
                            const acct = accounts.find(a => a.code === e.target.value);
                            setEditForm(f => ({ ...f, accountCode: e.target.value, accountName: acct?.name || '', accountType: acct?.type || '' }));
                          }} className="w-full text-sm border border-surface-200 rounded-lg px-3 py-2 bg-white">
                            <option value="">Keep current account</option>
                            {accounts.map(a => (
                              <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(entry.id)} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                          <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
                          <div><span className="text-surface-400">Category:</span> <span className="text-surface-700">{entry.category}</span></div>
                          <div><span className="text-surface-400">Source:</span> <span className="text-surface-700">{entry.source}</span></div>
                          {entry.note && <div><span className="text-surface-400">Note:</span> <span className="text-surface-700">{entry.note}</span></div>}
                          <div className="col-span-full">
                            <details>
                              <summary className="cursor-pointer text-primary-600 font-medium text-xs hover:underline">
                                Raw Data ({Object.keys(entry.rawData).length} fields)
                              </summary>
                              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                                {Object.entries(entry.rawData).map(([k, v]) => (
                                  <div key={k} className="truncate">
                                    <span className="text-surface-400">{k}:</span>{' '}
                                    <span className="text-surface-600">{v}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(entry)}>Edit</Button>
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
