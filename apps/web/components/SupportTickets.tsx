import { useState, useEffect, useCallback } from 'react';
import { Button, Badge, Input, EmptyState } from '@/components/ui';
import toast from 'react-hot-toast';

interface TicketMessage {
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

interface SupportTicket {
  _id: string;
  userId: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_BADGE: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
  open: { variant: 'info', label: 'Open' },
  in_progress: { variant: 'warning', label: 'In Progress' },
  resolved: { variant: 'success', label: 'Resolved' },
  closed: { variant: 'default', label: 'Closed' },
};

const PRIORITY_BADGE: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
  low: { variant: 'default', label: 'Low' },
  normal: { variant: 'info', label: 'Normal' },
  high: { variant: 'warning', label: 'High' },
  urgent: { variant: 'danger', label: 'Urgent' },
};

export default function SupportTickets({ userId }: { userId: string }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [creating, setCreating] = useState(false);
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [lastReadTimestamps, setLastReadTimestamps] = useState<Record<string, number>>({});

  const markRead = (ticketId: string, timestamp: string) => {
    const updated = { ...lastReadTimestamps, [ticketId]: new Date(timestamp).getTime() };
    setLastReadTimestamps(updated);
    try { localStorage.setItem('ticketLastRead', JSON.stringify(updated)); } catch {}
  };

  const isUnread = (ticket: SupportTicket): boolean => {
    if (ticket.messages.length === 0) return false;
    const lastMsg = new Date(ticket.messages[ticket.messages.length - 1].createdAt).getTime();
    const lastRead = lastReadTimestamps[ticket._id] || 0;
    return lastMsg > lastRead;
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ticketLastRead');
      if (stored) setLastReadTimestamps(JSON.parse(stored));
    } catch {}
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/support-tickets?${params}`);
      const json = await res.json();
      if (json.success) {
        setTickets(json.data);
        setTotalPages(json.pages || 1);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    if (selected) markRead(selected._id, selected.updatedAt);
  }, [selected]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, priority }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Ticket created');
        setShowForm(false);
        setSubject('');
        setBody('');
        setPriority('normal');
        fetchTickets();
      } else toast.error(json.error || 'Failed to create ticket');
    } catch { toast.error('Failed to create ticket'); }
    setCreating(false);
  };

  const handleReply = async () => {
    if (!reply.trim() || !selected) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/support-tickets/${selected._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply }),
      });
      const json = await res.json();
      if (json.success) {
        setSelected(json.data);
        setReply('');
        toast.success('Reply sent');
        fetchTickets();
      } else toast.error(json.error || 'Failed to send reply');
    } catch { toast.error('Failed to send reply'); }
    setReplying(false);
  };

  const handleStatusChange = async (status: string) => {
    if (!selected) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/support-tickets/${selected._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        setSelected(json.data);
        toast.success(`Status changed to ${status}`);
        fetchTickets();
      } else toast.error(json.error || 'Failed to update status');
    } catch { toast.error('Failed to update status'); }
    setStatusUpdating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-surface-900">Support Tickets</h2>
        <Button onClick={() => setShowForm(true)}>New Ticket</Button>
      </div>

      {!selected && (
        <>
          <div className="flex gap-1 flex-wrap">
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  statusFilter === s ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'
                }`}
              >
                {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full" />
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              }
              title="No tickets yet"
              description="Create a support ticket and we'll get back to you."
              action={<Button onClick={() => setShowForm(true)}>New Ticket</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-3 px-3 font-medium text-surface-500">Subject</th>
                    <th className="text-left py-3 px-3 font-medium text-surface-500">Priority</th>
                    <th className="text-left py-3 px-3 font-medium text-surface-500">Status</th>
                    <th className="text-left py-3 px-3 font-medium text-surface-500">Messages</th>
                    <th className="text-right py-3 px-3 font-medium text-surface-500">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t._id} className={`border-b border-surface-100 hover:bg-surface-50 transition-colors cursor-pointer ${isUnread(t) ? 'bg-primary-50/40' : ''}`} onClick={() => { setSelected(t); markRead(t._id, t.updatedAt); }}>
                      <td className="py-3 px-3">
            <div className="flex items-center gap-2 flex-wrap">
                          {isUnread(t) && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                          <span className={`font-medium ${isUnread(t) ? 'text-surface-900' : 'text-primary-600 hover:text-primary-700'}`}>{t.subject}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3"><Badge variant={PRIORITY_BADGE[t.priority].variant}>{PRIORITY_BADGE[t.priority].label}</Badge></td>
                      <td className="py-3 px-3"><Badge variant={STATUS_BADGE[t.status].variant}>{STATUS_BADGE[t.status].label}</Badge></td>
                      <td className="py-3 px-3 text-surface-500">{t.messages.length}</td>
                      <td className="py-3 px-3 text-right text-surface-500">{new Date(t.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm rounded-lg border border-surface-200 disabled:opacity-50 hover:bg-surface-50">Previous</button>
              <span className="text-sm text-surface-500">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm rounded-lg border border-surface-200 disabled:opacity-50 hover:bg-surface-50">Next</button>
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <button onClick={() => setSelected(null)} className="text-sm text-primary-600 hover:text-primary-700 mb-2">&larr; Back to tickets</button>
              <h3 className="text-lg font-semibold text-surface-900">{selected.subject}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={STATUS_BADGE[selected.status].variant}>{STATUS_BADGE[selected.status].label}</Badge>
                <Badge variant={PRIORITY_BADGE[selected.priority].variant}>{PRIORITY_BADGE[selected.priority].label}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {['open', 'in_progress', 'resolved', 'closed'].filter(s => s !== selected.status).map(s => (
                <Button key={s} size="sm" variant="secondary" onClick={() => handleStatusChange(s)} loading={statusUpdating}>
                  Mark {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {selected.messages.map((msg, i) => (
              <div key={i} className={`p-4 rounded-lg border ${msg.senderId === userId ? 'bg-primary-50 border-primary-200 ml-8' : 'bg-surface-50 border-surface-200 mr-8'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-surface-900">{msg.senderName}</span>
                  <span className="text-xs text-surface-400">{new Date(msg.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-surface-700 whitespace-pre-wrap">{msg.body}</p>
              </div>
            ))}
          </div>

          {selected.status !== 'closed' && (
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <textarea
                  placeholder="Type your reply..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
              <Button onClick={handleReply} loading={replying} className="mt-0.5">Send</Button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[10vh]">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-modal border border-surface-200 w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4">
            <div className="sticky top-0 bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="text-lg font-semibold text-surface-900">New Support Ticket</h3>
              <button onClick={() => setShowForm(false)} className="p-2.5 sm:p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100 min-w-10 min-h-10 sm:min-w-0 sm:min-h-0 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="Brief description of the issue" />
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Message</label>
                <textarea
                  placeholder="Describe your issue in detail..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  required
                  className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="pt-2">
                <Button type="submit" loading={creating}>Submit Ticket</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
