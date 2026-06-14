import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import toast from 'react-hot-toast';

type ClosedPeriod = {
  _id: string;
  yearMonth: string;
  closedAt: string;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getLast12Months(): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push(ym);
  }
  return result;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}

export default function PeriodClose({ userId }: { userId: string }) {
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriod[]>([]);
  const [tier, setTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [periodsJson, subJson] = await Promise.all([
        api('/api/periods?userId=' + encodeURIComponent(userId)),
        api('/api/subscription'),
      ]);
      if (periodsJson.success) setClosedPeriods(periodsJson.data);
      if (subJson.success) setTier(subJson.data.tier);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const isPro = tier === 'pro' || tier === 'business';
  const allMonths = getLast12Months();
  const closedSet = new Set(closedPeriods.map((p) => p.yearMonth));
  const openMonths = allMonths.filter((ym) => !closedSet.has(ym));

  const handleClose = async (ym: string) => {
    setBusy(ym);
    try {
      const json = await api(`/api/periods/${ym}`, { method: 'POST', body: JSON.stringify({ userId }) });
      if (json.success) {
        toast.success(`${formatMonth(ym)} closed`);
        loadData();
      } else {
        toast.error(json.error || 'Failed to close period');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setBusy(null);
    }
  };

  const handleReopen = async (ym: string) => {
    setBusy(ym);
    try {
      const json = await api(`/api/periods/${ym}`, { method: 'DELETE', body: JSON.stringify({ userId }) });
      if (json.success) {
        toast.success(`${formatMonth(ym)} reopened`);
        loadData();
      } else {
        toast.error(json.error || 'Failed to reopen period');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Card padding="lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-surface-900">Period Close</h2>
          {!isPro && !loading && (
            <Badge variant="warning" size="md">Pro feature</Badge>
          )}
        </div>
        <p className="text-sm text-surface-500 mb-6">
          Close periods to prevent edits, deletions, and imports. Closed periods can be reopened if needed.
        </p>

        {loading ? (
          <div className="text-center py-8 text-surface-400">Loading periods...</div>
        ) : !isPro ? (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-sm font-semibold text-amber-800 mb-1">Period close requires Pro plan</p>
            <p className="text-xs text-amber-600 mb-4">Upgrade to lock periods against changes and keep your financial data secure.</p>
            <a
              href="/pricing"
              className="inline-block px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg hover:from-primary-400 hover:to-primary-500 transition-all duration-300"
            >
              Upgrade to Pro
            </a>
          </div>
        ) : (
          <>
            {openMonths.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-surface-700 mb-3">Open Periods</h3>
                <div className="space-y-2">
                  {openMonths.map((ym) => (
                    <div key={ym} className="flex items-center justify-between px-4 py-3 bg-white border border-surface-200 rounded-lg hover:border-surface-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-sm font-medium text-surface-900">{formatMonth(ym)}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleClose(ym)}
                        loading={busy === ym}
                      >
                        Close Period
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {closedPeriods.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-surface-700 mb-3">Closed Periods</h3>
                <div className="space-y-2">
                  {closedPeriods.map((p) => (
                    <div key={p._id} className="flex items-center justify-between px-4 py-3 bg-surface-50 border border-surface-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-surface-300" />
                        <span className="text-sm font-medium text-surface-700">{formatMonth(p.yearMonth)}</span>
                        <span className="text-xs text-surface-400">
                          Closed {new Date(p.closedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReopen(p.yearMonth)}
                        loading={busy === p.yearMonth}
                      >
                        Reopen
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {closedPeriods.length === 0 && openMonths.length === 0 && (
              <div className="text-center py-8 text-surface-400 text-sm">No periods found.</div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
