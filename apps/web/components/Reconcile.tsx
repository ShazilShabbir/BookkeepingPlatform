import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { formatCurrency } from '@/lib/format';

type Step = 'setup' | 'review' | 'summary' | 'completed';

interface LineItem {
  _id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  status: 'unmatched' | 'matched' | 'excluded';
  matchedEntryId: string | null;
  matchedLineIds: string[];
  confidence: number;
}

interface AccountOption { code: string; name: string; }

function fmt(n: number, currency = 'USD') { return formatCurrency(n, currency); }

export default function Reconcile({ userId }: { userId: string }) {
  const [step, setStep] = useState<Step>('setup');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountCode, setAccountCode] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [startingBalance, setStartingBalance] = useState('');
  const [statementBalance, setStatementBalance] = useState('');
  const [reconciliationId, setReconciliationId] = useState<string | null>(null);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [matchSearch, setMatchSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/accounts?userId=' + encodeURIComponent(userId))
      .then(r => r.json())
      .then(json => { if (json.success) setAccounts(json.data || []); })
      .catch(() => {});
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/reconcile?userId=${encodeURIComponent(userId)}`);
      const json = await res.json();
      if (json.success) setHistory(json.data || []);
    } catch {}
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!accountCode || !periodStart || !periodEnd) {
      toast.error('Select an account and date range first');
      return;
    }
    setLoading(true);
    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      const res = await fetch('/api/reconcile/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          accountCode,
          periodStart,
          periodEnd,
          startingBalance: parseFloat(startingBalance) || 0,
          statementBalance: parseFloat(statementBalance) || 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setReconciliationId(json.data.reconciliationId);
        toast.success(`Loaded ${json.data.totalLines} statement lines`);
        await runProcess(json.data.reconciliationId);
      } else {
        toast.error(json.error || 'Upload failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const runProcess = async (recId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/reconcile/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reconciliationId: recId }),
      });
      const json = await res.json();
      if (json.success) {
        setLines(json.data.lines || []);
        setStats(json.data);
        setStep('review');
      } else {
        toast.error(json.error || 'Processing failed');
      }
    } catch {
      toast.error('Processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchAction = async (lineId: string, action: 'match' | 'unmatch' | 'exclude', entryId?: string, lineIds?: string[]) => {
    try {
      const res = await fetch('/api/reconcile/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reconciliationId,
          lineId,
          action,
          matchedEntryId: entryId,
          matchedLineIds: lineIds || [],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setLines(prev => prev.map(l => {
          if (l._id === lineId) {
            if (action === 'match') return { ...l, status: 'matched', matchedEntryId: entryId || null, matchedLineIds: lineIds || [], confidence: 1 };
            if (action === 'unmatch') return { ...l, status: 'unmatched', matchedEntryId: null, matchedLineIds: [], confidence: 0 };
            if (action === 'exclude') return { ...l, status: 'excluded', matchedEntryId: null, matchedLineIds: [] };
          }
          return l;
        }));
        if (stats) {
          setStats({ ...stats, matchedCount: json.data.matchedCount, unmatchedCount: json.data.unmatchedCount });
        }
      } else {
        toast.error(json.error || 'Action failed');
      }
    } catch {
      toast.error('Action failed');
    }
  };

  const searchEntries = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/entries/search?q=${encodeURIComponent(query)}&accountCode=${accountCode}&userId=${encodeURIComponent(userId)}`);
      const json = await res.json();
      if (json.success) setSearchResults(json.data || []);
    } catch {}
    finally { setSearching(false); }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reconcile/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reconciliationId }),
      });
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
        setStep('completed');
        toast.success('Reconciliation completed');
        fetchHistory();
      } else {
        toast.error(json.error || 'Confirmation failed');
      }
    } catch {
      toast.error('Confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/reconcile?id=${id}&userId=${encodeURIComponent(userId)}`);
      const json = await res.json();
      if (json.success) {
        setReconciliationId(id);
        setLines(json.data.lines || []);
        setStats(json.data);
        setPeriodStart(json.data.periodStart);
        setPeriodEnd(json.data.periodEnd);
        setAccountCode(json.data.accountCode);
        setStep('summary');
      }
    } catch {
      toast.error('Failed to load reconciliation');
    }
  };

  const reset = () => {
    setStep('setup');
    setReconciliationId(null);
    setLines([]);
    setStats(null);
    setAccountCode('');
    setPeriodStart('');
    setPeriodEnd('');
    setStartingBalance('');
    setStatementBalance('');
    setSelectedLineId(null);
    setMatchSearch('');
    setSearchResults([]);
  };

  const unmatchedCount = lines.filter(l => l.status === 'unmatched').length;
  const matchedCount = lines.filter(l => l.status === 'matched').length;
  const excludedCount = lines.filter(l => l.status === 'excluded').length;

  const renderSetup = () => (
    <div className="space-y-6">
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-surface-900 mb-4">New Bank Reconciliation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Cash Account</label>
            <select value={accountCode} onChange={e => setAccountCode(e.target.value)}
              className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Select account...</option>
              {accounts.filter(a => a.code.startsWith('1')).map(a => (
                <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Statement Balance</label>
            <input type="number" step="0.01" value={statementBalance} onChange={e => setStatementBalance(e.target.value)}
              placeholder="0.00"
              className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Period Start</label>
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
              className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Period End</label>
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
              className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Starting Balance (optional)</label>
            <input type="number" step="0.01" value={startingBalance} onChange={e => setStartingBalance(e.target.value)}
              placeholder="0.00"
              className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="border-t border-surface-200 pt-4">
          <p className="text-sm text-surface-600 mb-3">Upload your bank statement CSV file:</p>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} loading={loading} className="bg-primary-600 hover:bg-primary-700 text-white">
            Upload Bank Statement CSV
          </Button>
        </div>
      </Card>

      {history.length > 0 && (
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-surface-900 mb-3">Previous Reconciliations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50">
                  <th className="py-2 px-3 text-left font-medium text-surface-500">Account</th>
                  <th className="py-2 px-3 text-left font-medium text-surface-500">Period</th>
                  <th className="py-2 px-3 text-center font-medium text-surface-500">Status</th>
                  <th className="py-2 px-3 text-right font-medium text-surface-500">Difference</th>
                  <th className="py-2 px-3 text-right font-medium text-surface-500">Date</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {history.map((h: any) => (
                  <tr key={h._id} className="border-t border-surface-100 hover:bg-surface-50">
                    <td className="py-2 px-3 font-mono text-surface-700">{h.accountCode}</td>
                    <td className="py-2 px-3 text-surface-600">{h.periodStart} to {h.periodEnd}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge className={h.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                        {h.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{fmt(h.difference || 0)}</td>
                    <td className="py-2 px-3 text-right text-surface-500">{new Date(h.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => loadHistoryDetail(h._id)} className="text-primary-600 hover:text-primary-700 text-xs font-medium">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );

  const renderReview = () => {
    const grouped = [
      { label: 'Unmatched', status: 'unmatched', color: 'text-red-600', bg: 'bg-red-50', lines: lines.filter(l => l.status === 'unmatched') },
      { label: 'Matched', status: 'matched', color: 'text-emerald-600', bg: 'bg-emerald-50', lines: lines.filter(l => l.status === 'matched') },
      { label: 'Excluded', status: 'excluded', color: 'text-surface-400', bg: 'bg-surface-50', lines: lines.filter(l => l.status === 'excluded') },
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <span>Matched: <strong className="text-emerald-600">{matchedCount}</strong></span>
            <span>Unmatched: <strong className="text-red-600">{unmatchedCount}</strong></span>
            <span>Excluded: <strong className="text-surface-400">{excludedCount}</strong></span>
            <span>Total: <strong>{lines.length}</strong></span>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setStep('setup')} variant="secondary">Back</Button>
            <Button onClick={handleConfirm} loading={loading} className="bg-primary-600 hover:bg-primary-700 text-white">
              Confirm Reconciliation
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            <div className="bg-surface-50 rounded-lg p-3 text-center">
              <p className="text-xs text-surface-500">Starting Balance</p>
              <p className="text-sm font-bold text-surface-900">{fmt(stats.startingBalance || 0)}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3 text-center">
              <p className="text-xs text-surface-500">Statement Balance</p>
              <p className="text-sm font-bold text-surface-900">{fmt(stats.statementBalance || 0)}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3 text-center">
              <p className="text-xs text-surface-500">Ledger Total</p>
              <p className="text-sm font-bold text-surface-900">{fmt(stats.ledgerBalance || 0)}</p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3 text-center">
              <p className="text-xs text-surface-500">Difference</p>
              <p className={clsx('text-sm font-bold', (stats.difference || 0) === 0 ? 'text-emerald-600' : 'text-red-600')}>
                {fmt(stats.difference || 0)}
              </p>
            </div>
            <div className="bg-surface-50 rounded-lg p-3 text-center">
              <p className="text-xs text-surface-500">Confidence</p>
              <p className="text-sm font-bold text-surface-900">
                {lines.length > 0 ? Math.round((matchedCount / lines.length) * 100) : 0}%
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-2 flex-wrap">
          {grouped.map(g => (
            <button key={g.status} onClick={() => {
              const el = document.getElementById(`group-${g.status}`);
              el?.scrollIntoView({ behavior: 'smooth' });
            }} className={clsx('px-3 py-1.5 text-xs font-medium rounded-lg', g.bg, g.color)}>
              {g.label} ({g.lines.length})
            </button>
          ))}
        </div>

        {/* Manual match sidebar */}
        {selectedLineId && (
          <div className="fixed inset-0 z-50 flex items-start justify-end">
            <div className="fixed inset-0 bg-black/20" onClick={() => setSelectedLineId(null)} />
            <div className="relative bg-white h-full w-full max-w-lg shadow-elevated border-l border-surface-200 overflow-y-auto animate-slide-left">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-surface-900">Manual Match</h3>
                  <button onClick={() => setSelectedLineId(null)} className="p-1 rounded-lg hover:bg-surface-100">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {(() => {
                  const line = lines.find(l => l._id === selectedLineId);
                  if (!line) return null;
                  return (
                    <div className="space-y-4">
                      <div className="bg-surface-50 rounded-lg p-3">
                        <p className="text-xs text-surface-400">{line.date}</p>
                        <p className="font-medium text-surface-900">{line.description}</p>
                        <p className="text-lg font-bold text-surface-900">{fmt(line.amount)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => { handleMatchAction(selectedLineId, 'match', line.matchedEntryId || undefined); setSelectedLineId(null); }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm flex-1" disabled={!line.matchedEntryId}>
                          Confirm Match
                        </Button>
                        <Button onClick={() => { handleMatchAction(selectedLineId, 'exclude'); setSelectedLineId(null); }}
                          variant="danger" className="text-sm">Exclude</Button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1">Search ledger entries</label>
                        <input type="text" value={matchSearch} onChange={e => { setMatchSearch(e.target.value); searchEntries(e.target.value); }}
                          placeholder="Search by description or amount..."
                          className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      {searching && <p className="text-xs text-surface-400">Searching...</p>}
                      {searchResults.length > 0 && (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {searchResults.slice(0, 20).map((entry: any) => (
                            <button key={entry._id} onClick={() => {
                              // Update the line's match
                              handleMatchAction(selectedLineId, 'match', entry._id, (entry.lines || []).map((l: any) => l._id));
                              setSelectedLineId(null);
                            }}
                              className={clsx('w-full text-left p-3 rounded-lg border transition-colors',
                                line.matchedEntryId === entry._id ? 'border-emerald-300 bg-emerald-50' : 'border-surface-200 hover:bg-surface-50')}>
                              <p className="text-xs text-surface-400">{entry.date}</p>
                              <p className="text-sm font-medium text-surface-900">{entry.description || 'No description'}</p>
                              <p className="text-sm font-bold text-surface-700">{fmt(entry.totalAmount || 0)}</p>
                            </button>
                          ))}
                        </div>
                      )}
                      {matchSearch && !searching && searchResults.length === 0 && (
                        <p className="text-xs text-surface-400">No matching entries found</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {grouped.map(g => g.lines.length > 0 && (
          <div key={g.status} id={`group-${g.status}`}>
            <h3 className={clsx('text-sm font-semibold mb-2', g.color)}>{g.label} ({g.lines.length})</h3>
            <div className="overflow-x-auto border border-surface-200 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-100">
                    <th className="py-2 px-3 text-left font-medium text-surface-500">Date</th>
                    <th className="py-2 px-3 text-left font-medium text-surface-500">Description</th>
                    <th className="py-2 px-3 text-right font-medium text-surface-500">Amount</th>
                    <th className="py-2 px-3 text-center font-medium text-surface-500">Match</th>
                    <th className="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {g.lines.map(line => (
                    <tr key={line._id} className="border-t border-surface-100 hover:bg-surface-50">
                      <td className="py-2 px-3 text-surface-600 whitespace-nowrap">{line.date}</td>
                      <td className="py-2 px-3 text-surface-900 max-w-md truncate">{line.description || '—'}</td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-surface-900">{fmt(line.amount)}</td>
                      <td className="py-2 px-3 text-center">
                        {line.confidence > 0 && (
                          <span className={clsx('text-xs font-medium', line.confidence >= 0.85 ? 'text-emerald-600' : line.confidence >= 0.6 ? 'text-amber-600' : 'text-red-600')}>
                            {Math.round(line.confidence * 100)}%
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex gap-1 justify-end">
                          {line.status === 'matched' && (
                            <button onClick={() => handleMatchAction(line._id, 'unmatch')}
                              className="text-xs text-amber-600 hover:text-amber-700 font-medium">Unmatch</button>
                          )}
                          {line.status === 'unmatched' && (
                            <>
                              <button onClick={() => { setSelectedLineId(line._id); setMatchSearch(line.description); searchEntries(line.description); }}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium">Match</button>
                              <button onClick={() => handleMatchAction(line._id, 'exclude')}
                                className="text-xs text-surface-400 hover:text-red-600 font-medium">Skip</button>
                            </>
                          )}
                          {line.status === 'excluded' && (
                            <button onClick={() => handleMatchAction(line._id, 'unmatch')}
                              className="text-xs text-surface-500 hover:text-primary-600 font-medium">Restore</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSummary = () => (
    <div className="space-y-6">
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-surface-900 mb-4">Reconciliation Summary</h2>
        {stats?.status === 'completed' ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <svg className="w-8 h-8 text-emerald-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-emerald-800">Reconciliation Complete</p>
              <p className="text-xs text-emerald-600 mt-1">
                {stats.difference === 0 ? 'Perfect match!' : `Difference: ${fmt(stats.difference)}`}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-surface-50 rounded-lg p-3 text-center">
                <p className="text-xs text-surface-500">Starting Balance</p>
                <p className="text-lg font-bold text-surface-900">{fmt(stats.startingBalance || 0)}</p>
              </div>
              <div className="bg-surface-50 rounded-lg p-3 text-center">
                <p className="text-xs text-surface-500">Statement Balance</p>
                <p className="text-lg font-bold text-surface-900">{fmt(stats.statementBalance || 0)}</p>
              </div>
              <div className="bg-surface-50 rounded-lg p-3 text-center">
                <p className="text-xs text-surface-500">Ledger Balance</p>
                <p className="text-lg font-bold text-surface-900">{fmt(stats.ledgerBalance || 0)}</p>
              </div>
              <div className="bg-surface-50 rounded-lg p-3 text-center">
                <p className="text-xs text-surface-500">Difference</p>
                <p className={clsx('text-lg font-bold', (stats.difference || 0) === 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {fmt(stats.difference || 0)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-sm">
              <div><p className="text-surface-500">Matched</p><p className="text-lg font-bold text-emerald-600">{stats.matchedCount || 0}</p></div>
              <div><p className="text-surface-500">Unmatched</p><p className="text-lg font-bold text-red-600">{stats.unmatchedCount || 0}</p></div>
              <div><p className="text-surface-500">Excluded</p><p className="text-lg font-bold text-surface-400">{stats.excludedCount || 0}</p></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-surface-50 rounded-lg p-3 text-center">
                <p className="text-xs text-surface-500">Starting Balance</p>
                <p className="text-lg font-bold text-surface-900">{fmt(stats?.startingBalance || 0)}</p>
              </div>
              <div className="bg-surface-50 rounded-lg p-3 text-center">
                <p className="text-xs text-surface-500">Statement Balance</p>
                <p className="text-lg font-bold text-surface-900">{fmt(stats?.statementBalance || 0)}</p>
              </div>
              <div className="bg-surface-50 rounded-lg p-3 text-center">
                <p className="text-xs text-surface-500">Ledger Balance</p>
                <p className="text-lg font-bold text-surface-900">{fmt(stats?.ledgerBalance || 0)}</p>
              </div>
              <div className="bg-surface-50 rounded-lg p-3 text-center">
                <p className="text-xs text-surface-500">Difference</p>
                <p className={clsx('text-lg font-bold', (stats?.difference || 0) === 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {fmt(stats?.difference || 0)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setStep('review')} variant="secondary">Back to Review</Button>
              <Button onClick={handleConfirm} loading={loading} className="bg-primary-600 hover:bg-primary-700 text-white">
                Confirm Reconciliation
              </Button>
            </div>
          </div>
        )}
      </Card>

      {lines.length > 0 && (
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-surface-900 mb-3">Statement Lines</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-100">
                  <th className="py-2 px-3 text-left font-medium text-surface-500">Date</th>
                  <th className="py-2 px-3 text-left font-medium text-surface-500">Description</th>
                  <th className="py-2 px-3 text-right font-medium text-surface-500">Amount</th>
                  <th className="py-2 px-3 text-center font-medium text-surface-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(line => (
                  <tr key={line._id} className="border-t border-surface-100">
                    <td className="py-2 px-3 text-surface-600">{line.date}</td>
                    <td className="py-2 px-3 text-surface-900 max-w-md truncate">{line.description || '—'}</td>
                    <td className="py-2 px-3 text-right font-mono text-surface-900">{fmt(line.amount)}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge className={line.status === 'matched' ? 'bg-emerald-100 text-emerald-700' : line.status === 'excluded' ? 'bg-surface-100 text-surface-500' : 'bg-red-100 text-red-700'}>
                        {line.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {stats?.status === 'completed' && (
        <div className="text-center">
          <Button onClick={reset} className="bg-primary-600 hover:bg-primary-700 text-white">
            Start New Reconciliation
          </Button>
        </div>
      )}
    </div>
  );

  if (step === 'setup') return renderSetup();
  if (step === 'review') return renderReview();
  return renderSummary();
}
