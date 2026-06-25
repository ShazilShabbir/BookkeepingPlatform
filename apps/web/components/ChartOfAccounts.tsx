import { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import { getCurrencySymbol, COMMON_CURRENCIES } from '@/lib/format';
import clsx from 'clsx';

type Account = {
  _id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  normalBalance: 'debit' | 'credit';
  currency: string;
  parentCode?: string;
  isActive: boolean;
};

const ACCOUNT_TYPES = [
  { key: 'all', label: 'All', color: 'bg-surface-100 text-surface-700 border-surface-200' },
  { key: 'asset', label: 'Assets', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'liability', label: 'Liabilities', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'equity', label: 'Equity', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'revenue', label: 'Revenue', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'expense', label: 'Expenses', color: 'bg-rose-50 text-rose-700 border-rose-200' },
] as const;

const TYPE_BADGE_VARIANT: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
  asset: 'info', liability: 'warning', equity: 'primary', revenue: 'success', expense: 'danger',
};

const ITEMS_PER_TYPE_PAGE = 10;

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export default function ChartOfAccounts({ userId }: { userId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<string>('all');
  const [typePages, setTypePages] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<Account['type']>('asset');
  const [formBalance, setFormBalance] = useState<Account['normalBalance']>('debit');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formParent, setFormParent] = useState('');
  const [showCsvTooltip, setShowCsvTooltip] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const json = await api('/api/accounts?userId=' + encodeURIComponent(userId) + '&limit=500');
      if (json.success) setAccounts(json.data);
      else toast.error(json.error || 'Failed to load accounts');
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, []);

  const resetForm = () => {
    setFormCode(''); setFormName(''); setFormType('asset');
    setFormBalance('debit'); setFormCurrency('USD'); setFormParent('');
    setShowForm(false); setEditingCode(null);
  };

  const handleSubmit = async () => {
    if (!formCode.trim() || !formName.trim()) {
      toast.error('Code and name are required');
      return;
    }
    setSubmitting(true);
    try {
      const body = { name: formName.trim(), type: formType, normalBalance: formBalance, currency: formCurrency, parentCode: formParent || null };
      if (editingCode) {
        const json = await api(`/api/accounts/${editingCode}`, { method: 'PUT', body: JSON.stringify(body) });
        if (json.success) { toast.success('Account updated'); resetForm(); loadAccounts(); }
        else toast.error(json.error || 'Failed to update');
      } else {
        const json = await api('/api/accounts', {
          method: 'POST',
          body: JSON.stringify({ code: formCode.trim(), ...body }),
        });
        if (json.success) { toast.success('Account created'); resetForm(); loadAccounts(); }
        else toast.error(json.error || 'Failed to create');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const deactivateAccount = async (account: Account) => {
    try {
      const json = await api(`/api/accounts/${account.code}`, { method: 'PUT', body: JSON.stringify({ isActive: false }) });
      if (json.success) { toast.success('Account deactivated'); loadAccounts(); }
      else toast.error(json.error || 'Failed to deactivate');
    } catch {
      toast.error('Network error');
    }
  };

  const startEdit = (account: Account) => {
    setEditingCode(account.code);
    setFormCode(account.code);
    setFormName(account.name);
    setFormType(account.type);
    setFormBalance(account.normalBalance);
    setFormCurrency(account.currency || 'USD');
    setFormParent(account.parentCode || '');
    setShowForm(true);
  };

  const handleExport = () => {
    const headers = 'code,name,type,normalBalance,currency,parentCode\n';
    const rows = accounts.map(a =>
      `"${a.code}","${a.name}","${a.type}","${a.normalBalance}","${a.currency || 'USD'}","${a.parentCode || ''}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'chart-of-accounts.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Accounts exported');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row'); return; }
      const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      if (!header.includes('code') || !header.includes('name') || !header.includes('type')) {
        toast.error('CSV must have columns: code, name, type');
        return;
      }
      const results = { created: 0, skipped: 0, errors: 0 };
      let lastError = '';
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
        const row = Object.fromEntries(header.map((h, idx) => [h, cols[idx] || '']));
        try {
          const body: Record<string, any> = { code: row.code, name: row.name, type: row.type, normalBalance: row.normalbalance || 'debit', currency: row.currency || 'USD' };
          if (row.parentcode) body.parentCode = row.parentcode;
          await api('/api/accounts', { method: 'POST', body: JSON.stringify(body) });
          results.created++;
        } catch (err: any) {
          if (err.message === 'Account code already exists') {
            results.skipped++;
          } else {
            results.errors++;
            lastError = err.message || 'Unknown error';
          }
        }
      }
      if (lastError) {
        toast.error(`Row error (example): ${lastError}`);
      }
      const parts = [`Created ${results.created}`];
      if (results.skipped > 0) parts.push(`${results.skipped} skipped (duplicates)`);
      if (results.errors > 0) parts.push(`${results.errors} failed`);
      toast.success(`Import complete: ${parts.join(', ')}`);
      loadAccounts();
    } catch {
      toast.error('Failed to parse CSV');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const accountMap = new Map(accounts.map(a => [a.code, a]));
  const childrenOf = (code: string) => accounts.filter(a => a.parentCode === code && a.isActive);
  const allChildrenOf = (code: string): Account[] => {
    const direct = childrenOf(code);
    const nested = direct.flatMap(c => allChildrenOf(c.code));
    return [...direct, ...nested];
  };

  const filtered = accounts.filter(a =>
    !search || a.code.toLowerCase().includes(search.toLowerCase()) ||
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = ACCOUNT_TYPES.filter(t => t.key !== 'all').map(t => ({
    ...t,
    topLevel: filtered.filter(a => a.type === t.key && !a.parentCode),
  }));

  const visibleGroups = activeType === 'all'
    ? grouped
    : grouped.filter(g => g.key === activeType);

  const setPage = (typeKey: string, page: number) => {
    setTypePages(prev => ({ ...prev, [typeKey]: page }));
  };

  const renderAccountRow = (account: Account, depth: number = 0) => {
    const kids = childrenOf(account.code).filter(c => filtered.includes(c));
    return (
      <div key={account.code}>
        <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-lg border border-surface-200 hover:border-surface-300 transition-colors" style={{ marginLeft: Math.min(depth * 20, 100) }}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {depth > 0 && (
              <svg className="w-3 h-3 text-surface-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            )}
            <span className="text-sm font-mono font-medium text-surface-700 w-16 shrink-0">{account.code}</span>
            <span className="text-sm font-medium text-surface-900 truncate">{account.name}</span>
            {account.currency && account.currency !== 'USD' && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-surface-100 text-surface-600">{account.currency}</span>
            )}
            <Badge variant={TYPE_BADGE_VARIANT[account.type]} size="sm">{account.normalBalance}</Badge>
            {account.parentCode && (
              <span className="text-xs text-surface-400">→ {accountMap.get(account.parentCode)?.name || account.parentCode}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-4">
            <button onClick={() => startEdit(account)} className="p-2.5 sm:p-1.5 text-surface-400 hover:text-primary-600 transition-colors min-w-10 min-h-10 sm:min-w-0 sm:min-h-0 flex items-center justify-center" title="Edit">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onClick={() => deactivateAccount(account)} className="p-2.5 sm:p-1.5 text-surface-400 hover:text-red-500 transition-colors min-w-10 min-h-10 sm:min-w-0 sm:min-h-0 flex items-center justify-center" title="Deactivate">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        {kids.map(kid => renderAccountRow(kid, depth + 1))}
      </div>
    );
  };

  const parentOptions = accounts.filter(a => a.isActive && a.type === formType && a.code !== formCode);
  const parentOptionsWithNested = parentOptions.filter(p => !allChildrenOf(p.code).some(c => c.code === formCode));

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <Card padding="lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-surface-900">Chart of Accounts</h2>
          <Badge variant="primary" size="md">{accounts.length} accounts</Badge>
        </div>
        <p className="text-sm text-surface-500 mb-6">
          Manage your chart of accounts. Accounts can be organized hierarchically by setting a parent account.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExport} variant="secondary">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </Button>
            <div className="relative">
              <Button onClick={() => fileRef.current?.click()} loading={importing} variant="secondary">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Import CSV
              </Button>
              <button onClick={() => setShowCsvTooltip(!showCsvTooltip)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-surface-200 text-surface-500 text-xs flex items-center justify-center hover:bg-surface-300" type="button" title="CSV format help">?</button>
              {showCsvTooltip && (
                <div className="absolute top-full mt-1.5 right-0 z-10 w-64 p-3 bg-white rounded-lg shadow-lg border border-surface-200 text-xs text-surface-600">
                  <p className="font-medium text-surface-800 mb-1">CSV format:</p>
                  <code className="block text-[11px] bg-surface-50 p-1.5 rounded border border-surface-200 break-all">
                    code,name,type,normalbalance,parentcode
                  </code>
                  <p className="mt-1">Download Export CSV as a template.</p>
                  <button onClick={() => setShowCsvTooltip(false)} className="mt-2 text-xs text-primary-600 hover:underline">Close</button>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Account
            </Button>
          </div>
        </div>

        {showForm && (
          <div className="mb-6 p-4 bg-surface-50 rounded-xl border border-surface-200 animate-slide-down">
            <h3 className="text-sm font-semibold text-surface-900 mb-4">
              {editingCode ? `Edit Account: ${editingCode}` : 'Create New Account'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <Input label="Code" placeholder="e.g. 1000" value={formCode} onChange={(e) => setFormCode(e.target.value)} disabled={!!editingCode} />
              <Input label="Name" placeholder="e.g. Cash" value={formName} onChange={(e) => setFormName(e.target.value)} />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700">Type</label>
                <select value={formType} onChange={(e) => { setFormType(e.target.value as Account['type']); setFormParent(''); }}
                  className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  {ACCOUNT_TYPES.filter(t => t.key !== 'all').map((t) => (<option key={t.key} value={t.key}>{t.label}</option>))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700">Normal Balance</label>
                <select value={formBalance} onChange={(e) => setFormBalance(e.target.value as Account['normalBalance'])}
                  className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-700">Currency</label>
                <select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)}
                  className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                  {COMMON_CURRENCIES.map((c) => (<option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Parent Account (optional)</label>
              <select value={formParent} onChange={(e) => setFormParent(e.target.value)}
                className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                <option value="">None (top-level account)</option>
                {parentOptionsWithNested.map(a => (
                  <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
                ))}
              </select>
              {parentOptionsWithNested.length === 0 && accounts.length > 0 && (
                <p className="text-xs text-surface-400 mt-1">No available parent accounts for this type</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleSubmit} loading={submitting}>{editingCode ? 'Save Changes' : 'Create Account'}</Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Type Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {ACCOUNT_TYPES.map((t) => {
            const count = t.key === 'all'
              ? filtered.length
              : filtered.filter(a => a.type === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setActiveType(t.key)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap',
                  activeType === t.key ? t.color : 'bg-white text-surface-500 border-surface-200 hover:border-surface-300',
                )}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (<div key={i} className="h-12 bg-surface-100 animate-pulse rounded-lg" />))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-surface-400 text-sm">No accounts yet. Create your first account to get started.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleGroups.map((group) => {
              const visibleTopLevel = group.topLevel.filter(a => filtered.includes(a));
              if (visibleTopLevel.length === 0) return null;
              const page = typePages[group.key] || 1;
              const totalPages = Math.ceil(visibleTopLevel.length / ITEMS_PER_TYPE_PAGE);
              const paged = visibleTopLevel.slice((page - 1) * ITEMS_PER_TYPE_PAGE, page * ITEMS_PER_TYPE_PAGE);
              return (
                <div key={group.key}>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border mb-3 ${group.color}`}>
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {paged.map(account => renderAccountRow(account))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-100">
                      <span className="text-xs text-surface-400">
                        {(page - 1) * ITEMS_PER_TYPE_PAGE + 1}–{Math.min(page * ITEMS_PER_TYPE_PAGE, visibleTopLevel.length)} of {visibleTopLevel.length}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage(group.key, page - 1)}
                          disabled={page <= 1}
                          className="px-3 py-1 text-xs font-medium rounded border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPage(group.key, page + 1)}
                          disabled={page >= totalPages}
                          className="px-3 py-1 text-xs font-medium rounded border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
