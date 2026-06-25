import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ip: string;
  createdAt: string;
}

export default function AdminAudit() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
        ...(actionFilter && { action: actionFilter }),
        ...(userFilter && { userId: userFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });
      const res = await fetch(`/api/admin/audit?${params}`);
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, userFilter, startDate, endDate, router]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const actionColor = (action: string) => {
    if (action.includes('delete')) return 'text-red-400';
    if (action.includes('create') || action.includes('import')) return 'text-emerald-400';
    if (action.includes('update') || action.includes('toggle')) return 'text-amber-400';
    if (action.includes('login')) return 'text-primary-400';
    return 'text-surface-400';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Audit Log</h2>
          <p className="text-sm text-surface-400 mt-1">{total.toLocaleString()} total entries</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-surface-800 border border-surface-700 rounded-lg text-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Actions</option>
            <option value="entry.create">Entry Created</option>
            <option value="entry.delete">Entry Deleted</option>
            <option value="import.create">Import Created</option>
            <option value="admin.user.update">User Updated</option>
            <option value="admin.user.delete">User Deleted</option>
            <option value="admin.impersonate">Impersonation</option>
            <option value="admin.feature.toggle">Feature Toggle</option>
          </select>
          <input
            type="text"
            placeholder="Filter by user ID..."
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-surface-800 border border-surface-700 rounded-lg text-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-surface-800 border border-surface-700 rounded-lg text-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Table */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Time</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">User</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Action</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Resource</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">IP</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-surface-500 text-sm">Loading...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-surface-500 text-sm">No audit log entries found.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <>
                      <tr key={log.id} className="hover:bg-surface-800/50 transition-colors">
                        <td className="px-5 py-3">
                          <span className="text-xs text-surface-400">{timeAgo(log.createdAt)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-surface-300 font-mono">{log.userId}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium ${actionColor(log.action)}`}>{log.action}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-surface-400">{log.resource}/{log.resourceId?.substring(0, 8)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-surface-500">{log.ip || '—'}</span>
                        </td>
                        <td className="px-5 py-3">
                          {log.details && Object.keys(log.details).length > 0 && (
                            <button
                              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                              className="text-surface-500 hover:text-surface-300"
                            >
                              <svg className={`w-4 h-4 transition-transform ${expandedLog === log.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedLog === log.id && log.details && (
                        <tr key={`${log.id}-detail`}>
                          <td colSpan={6} className="px-5 py-3 bg-surface-800/50">
                            <pre className="text-xs text-surface-400 overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-surface-500">Page {page} of {totalPages}</p>
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
