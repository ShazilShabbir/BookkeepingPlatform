import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  companyName: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  entryUsage: number;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(tierFilter && { tier: tierFilter }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, tierFilter, statusFilter, router]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to impersonate');
        return;
      }
      window.open(`/admin/impersonate?token=${data.token}`, '_blank');
      toast.success(`Impersonating ${data.user.email}`);
    } catch {
      toast.error('Failed to impersonate user');
    }
  };

  const handleEdit = async (userId: string, field: string, value: string) => {
    try {
      const body: Record<string, string> = {};
      if (field === 'tier') body.tier = value;
      if (field === 'status') body.status = value;
      if (field === 'role') body.role = value;

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Update failed');
        return;
      }
      toast.success('Updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This will soft-delete their account.`)) return;
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Delete failed');
        return;
      }
      toast.success('User deleted');
      fetchUsers();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const tierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      free: 'bg-surface-700 text-surface-300',
      pro: 'bg-primary-500/15 text-primary-400',
      business: 'bg-amber-500/15 text-amber-400',
    };
    return colors[tier] || colors.free;
  };

  const statusDot = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-emerald-400',
      trialing: 'bg-primary-400',
      past_due: 'bg-amber-400',
      canceled: 'bg-red-400',
    };
    return colors[status] || 'bg-surface-500';
  };

  const entryLimit = (tier: string) => {
    if (tier === 'business') return -1;
    if (tier === 'pro') return 1000;
    return 50;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">User Management</h2>
            <p className="text-sm text-surface-400 mt-1">{total} total users</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2.5 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={tierFilter}
            onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-surface-800 border border-surface-700 rounded-lg text-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Tiers</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-surface-800 border border-surface-700 rounded-lg text-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Canceled</option>
          </select>
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
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Entries</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Role</th>
                  <th className="text-right text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-surface-500 text-sm">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-surface-500 text-sm">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const limit = entryLimit(user.subscriptionTier);
                    return (
                      <tr key={user.id} className="hover:bg-surface-800/50 transition-colors">
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm font-medium text-white">{user.name}</p>
                            <p className="text-xs text-surface-500">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {editingUser?.id === user.id && editField === 'tier' ? (
                            <select
                              value={editValue}
                              onChange={(e) => handleEdit(user.id, 'tier', e.target.value)}
                              className="px-2 py-1 bg-surface-700 border border-surface-600 rounded text-xs text-white"
                            >
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                              <option value="business">Business</option>
                            </select>
                          ) : (
                            <button
                              onClick={() => { setEditingUser(user); setEditField('tier'); setEditValue(user.subscriptionTier); }}
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 ${tierBadge(user.subscriptionTier)}`}
                            >
                              {user.subscriptionTier === 'business' ? 'Business' : user.subscriptionTier === 'pro' ? 'Pro' : 'Free'}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {editingUser?.id === user.id && editField === 'status' ? (
                            <select
                              value={editValue}
                              onChange={(e) => handleEdit(user.id, 'status', e.target.value)}
                              className="px-2 py-1 bg-surface-700 border border-surface-600 rounded text-xs text-white"
                            >
                              <option value="active">Active</option>
                              <option value="trialing">Trialing</option>
                              <option value="past_due">Past Due</option>
                              <option value="canceled">Canceled</option>
                              <option value="free">Free</option>
                            </select>
                          ) : (
                            <button
                              onClick={() => { setEditingUser(user); setEditField('status'); setEditValue(user.subscriptionStatus); }}
                              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                            >
                              <span className={`w-2 h-2 rounded-full ${statusDot(user.subscriptionStatus)}`} />
                              <span className="text-xs text-surface-300 capitalize">{user.subscriptionStatus}</span>
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-surface-300">{user.entryUsage}</span>
                            <span className="text-xs text-surface-600">/ {limit === -1 ? '∞' : limit}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {editingUser?.id === user.id && editField === 'role' ? (
                            <select
                              value={editValue}
                              onChange={(e) => handleEdit(user.id, 'role', e.target.value)}
                              className="px-2 py-1 bg-surface-700 border border-surface-600 rounded text-xs text-white"
                            >
                              <option value="admin">Admin</option>
                              <option value="superadmin">Superadmin</option>
                              <option value="customer">Customer</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          ) : (
                            <button
                              onClick={() => { setEditingUser(user); setEditField('role'); setEditValue(user.role); }}
                              className="text-xs text-surface-400 hover:text-white cursor-pointer capitalize"
                            >
                              {user.role}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleImpersonate(user.id)}
                              className="px-3 py-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors"
                              title="Impersonate user"
                            >
                              Impersonate
                            </button>
                            <button
                              onClick={() => handleDelete(user.id, user.email)}
                              className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete user"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-surface-500">
              Page {page} of {totalPages} ({total} users)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-medium text-surface-400 hover:text-white bg-surface-800 border border-surface-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-medium text-surface-400 hover:text-white bg-surface-800 border border-surface-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
