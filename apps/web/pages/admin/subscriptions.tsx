import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';

interface SubStats {
  totalUsers: number;
  activeSubscriptions: number;
  mrr: number;
  churnRate: number;
  pastDue: number;
  canceled30d: number;
  byStatus: Record<string, number>;
  byTier: Record<string, number>;
}

interface User {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  stripeCustomerId: string;
  currentPeriodEnd: string;
}

const PAGE_SIZE = 20;

export default function AdminSubscriptions() {
  const router = useRouter();
  const [stats, setStats] = useState<SubStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'past_due' | 'canceled' | 'trialing'>('active');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then((r) => r.json()),
      fetch(`/api/admin/users?status=${tab}&page=1&limit=${PAGE_SIZE}`).then((r) => r.json()),
    ]).then(([statsData, usersData]) => {
      if (statsData.error === 'Admin authentication required') { router.push('/admin/login'); return; }
      setStats(statsData);
      setUsers(usersData.users || []);
      setTotal(usersData.total || 0);
      setTotalPages(usersData.totalPages || 1);
      setPage(1);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router, tab]);

  const loadUsers = async (newTab: typeof tab, pg: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?status=${newTab}&page=${pg}&limit=${PAGE_SIZE}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch { /* empty */ }
    setLoading(false);
  };

  const handleTabChange = async (newTab: typeof tab) => {
    setTab(newTab);
    setPage(1);
    loadUsers(newTab, 1);
  };

  if (loading && !stats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-surface-400 text-sm">Loading subscriptions...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Subscriptions</h2>
          <p className="text-sm text-surface-400 mt-1">Monitor active subscriptions, churn, and Stripe integration.</p>
        </div>

        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">Active</p>
              <p className="text-3xl font-bold mt-2 text-emerald-400">{stats.activeSubscriptions}</p>
              <p className="text-xs text-surface-600 mt-1">Active + Trialing</p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">MRR</p>
              <p className="text-3xl font-bold mt-2 text-primary-400">${stats.mrr}</p>
              <p className="text-xs text-surface-600 mt-1">Monthly Recurring Revenue</p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">Churn (30d)</p>
              <p className="text-3xl font-bold mt-2 text-amber-400">{stats.churnRate}%</p>
              <p className="text-xs text-surface-600 mt-1">{stats.canceled30d} cancellations</p>
            </div>
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">Past Due</p>
              <p className="text-3xl font-bold mt-2 text-red-400">{stats.pastDue}</p>
              <p className="text-xs text-surface-600 mt-1">Failed payments</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {(['active', 'past_due', 'canceled', 'trialing'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800 border border-transparent'
              }`}
            >
              {t === 'active' ? 'Active' : t === 'past_due' ? 'Past Due' : t === 'canceled' ? 'Canceled' : 'Trialing'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">User</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Tier</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Period End</th>
                  <th className="text-right text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Stripe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-surface-500 text-sm">Loading...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-surface-500 text-sm">No users found.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-800/50 transition-colors">
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          <p className="text-xs text-surface-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.subscriptionTier === 'business' ? 'bg-amber-500/15 text-amber-400'
                            : user.subscriptionTier === 'pro' ? 'bg-primary-500/15 text-primary-400'
                              : 'bg-surface-700 text-surface-300'
                        }`}>
                          {user.subscriptionTier}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            user.subscriptionStatus === 'active' ? 'bg-emerald-400'
                              : user.subscriptionStatus === 'trialing' ? 'bg-primary-400'
                                : user.subscriptionStatus === 'past_due' ? 'bg-amber-400'
                                  : 'bg-red-400'
                          }`} />
                          <span className="text-xs text-surface-300 capitalize">{user.subscriptionStatus}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-surface-400">
                          {user.currentPeriodEnd
                            ? new Date(user.currentPeriodEnd).toLocaleDateString()
                            : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {user.stripeCustomerId ? (
                          <a
                            href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-400 hover:text-primary-300 hover:underline"
                          >
                            View in Stripe
                          </a>
                        ) : (
                          <span className="text-xs text-surface-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-surface-800">
              <span className="text-xs text-surface-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPage(p => p - 1); loadUsers(tab, page - 1); }}
                  disabled={page <= 1}
                  className="px-3 py-1 text-xs font-medium rounded border border-surface-700 text-surface-400 hover:text-white hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => { setPage(p => p + 1); loadUsers(tab, page + 1); }}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-xs font-medium rounded border border-surface-700 text-surface-400 hover:text-white hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
