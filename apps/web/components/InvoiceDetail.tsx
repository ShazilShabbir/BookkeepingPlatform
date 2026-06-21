import { useState } from 'react';
import { Button, Badge } from '@/components/ui';
import InvoiceForm from '@/components/InvoiceForm';
import toast from 'react-hot-toast';
import type { InvoiceData, InvoiceStatus } from '@/types/invoice';

const STATUS_BADGE: Record<InvoiceStatus, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
  draft: { variant: 'default', label: 'Draft' },
  sent: { variant: 'info', label: 'Sent' },
  paid: { variant: 'success', label: 'Paid' },
  overdue: { variant: 'danger', label: 'Overdue' },
  cancelled: { variant: 'warning', label: 'Cancelled' },
};

interface Props {
  invoice: InvoiceData;
  onClose: () => void;
  onUpdate: () => void;
}

export default function InvoiceDetail({ invoice, onClose, onUpdate }: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const doAction = async (action: string, url: string, method = 'POST') => {
    setActionLoading(action);
    try {
      const res = await fetch(url, { method });
      const json = await res.json();
      if (json.success) {
        toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} successful`);
        onUpdate();
        if (action !== 'delete') onClose();
      } else toast.error(json.error || `Failed to ${action}`);
    } catch { toast.error(`Failed to ${action}`); }
    setActionLoading(null);
  };

  const handlePay = async () => {
    setActionLoading('pay');
    try {
      const res = await fetch(`/api/invoices/${invoice._id}/pay`, { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data?.url) {
        window.open(json.data.url, '_blank');
        toast.success('Payment link created');
        onUpdate();
      } else toast.error(json.error || 'Failed to create payment link');
    } catch { toast.error('Failed to create payment link'); }
    setActionLoading(null);
  };

  if (editing) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[10vh]">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditing(false)} />
        <div className="relative bg-white rounded-2xl shadow-modal border border-surface-200 w-full max-w-3xl max-h-[85vh] overflow-y-auto mx-4">
          <div className="sticky top-0 bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
            <h3 className="text-lg font-semibold text-surface-900">Edit Invoice {invoice.invoiceNumber}</h3>
            <button onClick={() => setEditing(false)} className="p-2.5 sm:p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100 min-w-10 min-h-10 sm:min-w-0 sm:min-h-0 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-6">
            <InvoiceForm onSuccess={() => { setEditing(false); onUpdate(); }} onCancel={() => setEditing(false)} editInvoice={invoice} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[10vh]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal border border-surface-200 w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4">
        <div className="sticky top-0 bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-surface-900">{invoice.invoiceNumber}</h3>
            <Badge variant={STATUS_BADGE[invoice.status].variant}>{STATUS_BADGE[invoice.status].label}</Badge>
          </div>
          <button onClick={onClose} className="p-2.5 sm:p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100 min-w-10 min-h-10 sm:min-w-0 sm:min-h-0 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1">Client</p>
              <p className="text-sm font-medium text-surface-900">{invoice.clientName}</p>
              {invoice.clientCompanyName && <p className="text-sm text-surface-500">{invoice.clientCompanyName}</p>}
              <p className="text-sm text-surface-500">{invoice.clientEmail}</p>
              {invoice.clientAddress && <p className="text-sm text-surface-500">{invoice.clientAddress}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1">Dates</p>
              <p className="text-sm text-surface-700">Issued: {new Date(invoice.issueDate).toLocaleDateString()}</p>
              <p className="text-sm text-surface-700">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-2 px-2 font-medium text-surface-500">Description</th>
                  <th className="text-right py-2 px-2 font-medium text-surface-500">Qty</th>
                  <th className="text-right py-2 px-2 font-medium text-surface-500">Unit Price</th>
                  <th className="text-right py-2 px-2 font-medium text-surface-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li, i) => (
                  <tr key={i} className="border-b border-surface-100">
                    <td className="py-2 px-2 text-surface-700">{li.description}</td>
                    <td className="py-2 px-2 text-right text-surface-700">{li.quantity}</td>
                    <td className="py-2 px-2 text-right text-surface-700 font-mono">${li.unitPrice.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-surface-900 font-mono font-medium">${li.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-right space-y-1 border-t border-surface-200 pt-4">
            <p className="text-sm text-surface-500">Subtotal: <span className="font-mono">${invoice.subtotal.toFixed(2)}</span></p>
            {invoice.taxRate > 0 && <p className="text-sm text-surface-500">Tax ({invoice.taxRate}%): <span className="font-mono">${invoice.taxAmount.toFixed(2)}</span></p>}
            <p className="text-xl font-bold text-surface-900">Total: <span className="font-mono">${invoice.total.toFixed(2)}</span></p>
            {invoice.amountPaid > 0 && <p className="text-sm text-emerald-600">Paid: <span className="font-mono">${invoice.amountPaid.toFixed(2)}</span></p>}
          </div>

          {invoice.notes && (
            <div className="bg-surface-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-surface-600">{invoice.notes}</p>
            </div>
          )}

          {invoice.terms && (
            <div className="bg-surface-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1">Payment Terms</p>
              <p className="text-sm text-surface-600">{invoice.terms}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-surface-200 px-6 py-4 flex items-center justify-between rounded-b-2xl">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => window.open(`/api/invoices/${invoice._id}/pdf`, '_blank')}>
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              PDF
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {invoice.status === 'draft' && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
                <Button size="sm" loading={actionLoading === 'send'} onClick={() => doAction('send', `/api/invoices/${invoice._id}/send`)}>Send</Button>
              </>
            )}
            {invoice.status === 'sent' && (
              <Button size="sm" loading={actionLoading === 'pay'} onClick={handlePay} disabled={!invoice.total}>Send Payment Link</Button>
            )}
            {invoice.status === 'draft' && (
              <Button size="sm" variant="ghost" loading={actionLoading === 'delete'} onClick={() => doAction('delete', `/api/invoices/${invoice._id}`, 'DELETE')} className="text-red-600 hover:text-red-700">Delete</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
