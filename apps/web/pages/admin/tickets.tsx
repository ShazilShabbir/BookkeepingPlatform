import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import toast from 'react-hot-toast';

interface Ticket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  messageCount: number;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminTickets() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
        ...(tab && { status: tab }),
      });
      const res = await fetch(`/api/admin/tickets?${params}`);
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  }, [page, tab, router]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status: newStatus }),
      });
      if (!res.ok) {
        toast.error('Failed to update ticket');
        return;
      }
      toast.success('Ticket updated');
      fetchTickets();
    } catch {
      toast.error('Failed to update ticket');
    }
  };

  const handlePriorityChange = async (ticketId: string, newPriority: string) => {
    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, priority: newPriority }),
      });
      if (!res.ok) {
        toast.error('Failed to update priority');
        return;
      }
      toast.success('Priority updated');
      fetchTickets();
    } catch {
      toast.error('Failed to update priority');
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-emerald-500/15 text-emerald-400',
      in_progress: 'bg-primary-500/15 text-primary-400',
      resolved: 'bg-surface-700 text-surface-400',
      closed: 'bg-surface-800 text-surface-500',
    };
    return colors[status] || colors.open;
  };

  const priorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'text-red-400',
      high: 'text-amber-400',
      normal: 'text-surface-400',
      low: 'text-surface-500',
    };
    return colors[priority] || colors.normal;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Support Tickets</h2>
          <p className="text-sm text-surface-400 mt-1">{total} total tickets</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { value: '', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'closed', label: 'Closed' },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => { setTab(t.value); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.value
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800 border border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Subject</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">User</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Priority</th>
                  <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Created</th>
                  <th className="text-right text-xs font-semibold text-surface-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-surface-500 text-sm">Loading...</td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-surface-500 text-sm">No tickets found.</td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-surface-800/50 transition-colors">
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">{ticket.subject}</p>
                          {ticket.lastMessage && (
                            <p className="text-xs text-surface-500 mt-0.5 truncate max-w-xs">{ticket.lastMessage}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm text-surface-300">{ticket.userName}</p>
                          <p className="text-xs text-surface-500">{ticket.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={ticket.status}
                          onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 focus:ring-2 focus:ring-primary-500 cursor-pointer ${statusColor(ticket.status)}`}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={ticket.priority}
                          onChange={(e) => handlePriorityChange(ticket.id, e.target.value)}
                          className={`text-xs font-medium bg-transparent border-0 focus:ring-2 focus:ring-primary-500 cursor-pointer ${priorityColor(ticket.priority)}`}
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-surface-400">{timeAgo(ticket.createdAt)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-xs text-surface-500">{ticket.messageCount} msgs</span>
                      </td>
                    </tr>
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
