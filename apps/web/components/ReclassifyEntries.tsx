import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui';
import toast from 'react-hot-toast';

type Account = {
  _id: string;
  code: string;
  name: string;
  type: string;
};

type JournalLine = {
  _id: string;
  accountCode: string;
  description?: string;
  debit: number;
  credit: number;
};

type JournalEntry = {
  _id: string;
  date: string;
  description: string;
  lines: JournalLine[];
};

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}

const PAGE_SIZE = 20;

export default function ReclassifyEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [activeReclass, setActiveReclass] = useState<{ entryId: string; lineId: string; oldCode: string } | null>(null);
  const [pickValue, setPickValue] = useState('');
  const [pickSearch, setPickSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const pickRef = useRef<HTMLDivElement>(null);

  const loadEntries = useCallback(async (pageNum: number, append: boolean, searchTerm: string) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('pageSize', String(PAGE_SIZE));
      if (searchTerm.trim()) params.set('q', searchTerm.trim());
      const json = await api(`/api/entries/search?${params.toString()}`);
      if (json.success) {
        setEntries(prev => append ? [...prev, ...json.data] : json.data);
        setHasMore(json.hasMore);
        setTotal(json.total);
      }
    } catch {
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadAccounts = async () => {
    try {
      const json = await api('/api/accounts');
      if (json.success) setAccounts(json.data);
    } catch {
      toast.error('Failed to load accounts');
    }
  };

  useEffect(() => { loadEntries(1, false, ''); loadAccounts(); }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickRef.current && !pickRef.current.contains(e.target as Node)) {
        setActiveReclass(null);
        setPickValue('');
        setPickSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadEntries(1, false, search);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadEntries(nextPage, true, search);
  };

  const handleReclassify = async () => {
    if (!activeReclass || !pickValue) return;
    setSaving(true);
    try {
      const json = await api('/api/entries/reclassify', {
        method: 'POST',
        body: JSON.stringify({
          entryId: activeReclass.entryId,
          lineId: activeReclass.lineId,
          newAccountCode: pickValue,
        }),
      });
      if (json.success) {
        const { oldCode, newCode } = json.data;
        setEntries((prev) =>
          prev.map((entry) => {
            if (entry._id !== activeReclass.entryId) return entry;
            return {
              ...entry,
              lines: entry.lines.map((line) => {
                if (line._id !== activeReclass.lineId) return line;
                return { ...line, accountCode: newCode };
              }),
            };
          })
        );
        toast.success(`Reclassified: ${oldCode} → ${newCode}`);
        setActiveReclass(null);
        setPickValue('');
        setPickSearch('');
      } else {
        toast.error(json.error || 'Reclassification failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const filteredAccounts = accounts.filter(
    (a) => !pickSearch || a.code.includes(pickSearch) || a.name.toLowerCase().includes(pickSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <Card padding="lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-surface-900">Reclassify Entries</h2>
          <Badge variant="primary" size="md">{total} entries</Badge>
        </div>
        <p className="text-sm text-surface-500 mb-6">
          Change the account code assigned to individual journal lines. Each line can be reclassified independently.
        </p>

        <form onSubmit={handleSearch} className="mb-6">
          <Input
            placeholder="Search entries by description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </form>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-surface-400 text-sm">{search ? 'No entries match your search.' : 'No journal entries found. Import some data first.'}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry._id} className="border border-surface-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-50 border-b border-surface-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-surface-400 shrink-0">{entry.date}</span>
                      <span className="text-sm font-medium text-surface-900 truncate">{entry.description || 'Untitled'}</span>
                    </div>
                    <Badge size="sm">{entry.lines.length} line{entry.lines.length > 1 ? 's' : ''}</Badge>
                  </div>
                  <div className="divide-y divide-surface-100">
                    {entry.lines.map((line) => {
                      const account = accounts.find((a) => a.code === line.accountCode);
                      const isActive = activeReclass?.entryId === entry._id && activeReclass?.lineId === line._id;
                      return (
                        <div key={line._id} className="px-4 py-2.5 flex items-center justify-between hover:bg-surface-50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-sm font-mono font-medium text-surface-700 w-20 shrink-0">{line.accountCode}</span>
                            <span className="text-xs text-surface-500 truncate flex-1">{account?.name || 'Unknown account'}</span>
                            <span className="text-sm font-mono text-surface-700 shrink-0">
                              {line.debit > 0 ? `$${line.debit.toFixed(2)} Dr` : line.credit > 0 ? `$${line.credit.toFixed(2)} Cr` : '-'}
                            </span>
                          </div>
                          <div className="relative shrink-0 ml-3">
                            {isActive ? (
                              <div ref={pickRef} className="absolute right-0 top-0 z-20 w-72 bg-white rounded-xl border border-surface-200 shadow-elevated p-3 animate-scale-in">
                                <Input
                                  placeholder="Search accounts..."
                                  value={pickSearch}
                                  onChange={(e) => { setPickSearch(e.target.value); setPickValue(''); }}
                                  autoFocus
                                  className="mb-2"
                                />
                                <div className="max-h-48 overflow-y-auto space-y-0.5">
                                  {filteredAccounts.length === 0 ? (
                                    <p className="text-xs text-surface-400 text-center py-3">No accounts found</p>
                                  ) : (
                                    filteredAccounts.slice(0, 20).map((acct) => (
                                      <button
                                        key={acct._id}
                                        onClick={() => { setPickValue(acct.code); setPickSearch(''); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                          pickValue === acct.code
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'hover:bg-surface-50 text-surface-700'
                                        }`}
                                      >
                                        <span className="font-mono font-medium">{acct.code}</span>
                                        <span className="text-surface-400 ml-2">{acct.name}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-surface-100">
                                  <Button size="sm" onClick={handleReclassify} loading={saving} disabled={!pickValue}>
                                    Confirm
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => { setActiveReclass(null); setPickValue(''); setPickSearch(''); }}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveReclass({ entryId: entry._id, lineId: line._id, oldCode: line.accountCode });
                                  setPickValue('');
                                  setPickSearch('');
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                              >
                                Reclassify
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-6">
                <Button type="button" variant="secondary" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
