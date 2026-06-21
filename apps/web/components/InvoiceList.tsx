import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Badge, Input, EmptyState, TableSkeleton } from '@/components/ui';
import InvoiceForm from '@/components/InvoiceForm';
import InvoiceDetail from '@/components/InvoiceDetail';
import toast from 'react-hot-toast';
import type { InvoiceData, InvoiceStatus } from '@/types/invoice';

const STATUS_BADGE: Record<InvoiceStatus, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
  draft: { variant: 'default', label: 'Draft' },
  sent: { variant: 'info', label: 'Sent' },
  paid: { variant: 'success', label: 'Paid' },
  overdue: { variant: 'danger', label: 'Overdue' },
  cancelled: { variant: 'warning', label: 'Cancelled' },
};

export default function InvoiceList({ userId }: { userId: string }) {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<InvoiceData | null>(null);
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/invoices?${params}`);
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data);
        setTotalPages(json.pages || 1);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Invoice deleted');
        fetchInvoices();
      } else toast.error(json.error || 'Failed to delete');
    } catch { toast.error('Failed to delete'); }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedInvoices = useMemo(() => {
    if (!sortKey) return invoices;
    return [...invoices].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === 'date') { av = new Date(a.issueDate).getTime(); bv = new Date(b.issueDate).getTime(); }
      else if (sortKey === 'amount') { av = a.total; bv = b.total; }
      else if (sortKey === 'due') { av = new Date(a.dueDate).getTime(); bv = new Date(b.dueDate).getTime(); }
      else return 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [invoices, sortKey, sortDir]);

  const SortIcon = ({ column }: { column: string }) => {
    if (sortKey !== column) return <svg className="w-3 h-3 text-surface-300 inline ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>;
    return <svg className={`w-3 h-3 inline ml-1 ${sortDir === 'asc' ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-surface-900">Invoices</h2>
        <Button onClick={() => setShowForm(true)}>New Invoice</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 flex-wrap">
          {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                statusFilter === s ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="sm:max-w-xs"
        />
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          title="No invoices yet"
          description="Create your first invoice to get paid faster."
          action={<Button onClick={() => setShowForm(true)}>Create Invoice</Button>}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-surface-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="text-left py-3 px-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Invoice</th>
                  <th className="text-left py-3 px-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Client</th>
                  <th className="text-left py-3 px-3 font-medium text-surface-500 text-xs uppercase tracking-wider cursor-pointer select-none hover:text-surface-700" onClick={() => handleSort('date')}>Date <SortIcon column="date" /></th>
                  <th className="text-left py-3 px-3 font-medium text-surface-500 text-xs uppercase tracking-wider cursor-pointer select-none hover:text-surface-700" onClick={() => handleSort('due')}>Due <SortIcon column="due" /></th>
                  <th className="text-right py-3 px-3 font-medium text-surface-500 text-xs uppercase tracking-wider cursor-pointer select-none hover:text-surface-700" onClick={() => handleSort('amount')}>Amount <SortIcon column="amount" /></th>
                  <th className="text-center py-3 px-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedInvoices.map((inv, idx) => (
                  <tr key={inv._id} className={`border-b border-surface-100 hover:bg-primary-50/40 transition-colors ${idx % 2 === 1 ? 'bg-surface-50/50' : ''}`}>
                    <td className="py-3 px-3">
                      <button onClick={() => setSelected(inv)} className="font-medium text-primary-600 hover:text-primary-700">
                        {inv.invoiceNumber}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-surface-700">{inv.clientName}</td>
                    <td className="py-3 px-3 text-surface-500">{new Date(inv.issueDate).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-surface-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-surface-900">${inv.total.toFixed(2)}</td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={STATUS_BADGE[inv.status].variant}>{STATUS_BADGE[inv.status].label}</Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelected(inv)} className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100" title="View">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(inv._id)} className="p-1.5 text-surface-400 hover:text-red-600 rounded-lg hover:bg-surface-100" title="Delete">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm rounded-lg border border-surface-200 disabled:opacity-50 hover:bg-surface-50">Previous</button>
              <span className="text-sm text-surface-500">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm rounded-lg border border-surface-200 disabled:opacity-50 hover:bg-surface-50">Next</button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[10vh]">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-modal border border-surface-200 w-full max-w-3xl max-h-[85vh] overflow-y-auto mx-4">
            <div className="sticky top-0 bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="text-lg font-semibold text-surface-900">New Invoice</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <InvoiceForm onSuccess={() => { setShowForm(false); fetchInvoices(); }} onCancel={() => setShowForm(false)} />
            </div>
          </div>
        </div>
      )}

      {selected && (
        <InvoiceDetail
          invoice={selected}
          onClose={() => setSelected(null)}
          onUpdate={fetchInvoices}
        />
      )}
    </div>
  );
}
