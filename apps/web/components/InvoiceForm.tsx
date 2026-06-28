import { useState, useCallback } from 'react';
import { Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';
import type { InvoiceLineItem, InvoiceData } from '@/types/invoice';
import { COMMON_CURRENCIES, getCurrencySymbol } from '@/lib/format';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  editInvoice?: InvoiceData;
}

export default function InvoiceForm({ onSuccess, onCancel, editInvoice }: Props) {
  const [clientName, setClientName] = useState(editInvoice?.clientName || '');
  const [clientEmail, setClientEmail] = useState(editInvoice?.clientEmail || '');
  const [clientAddress, setClientAddress] = useState(editInvoice?.clientAddress || '');
  const [clientCompanyName, setClientCompanyName] = useState(editInvoice?.clientCompanyName || '');
  const [issueDate, setIssueDate] = useState(editInvoice?.issueDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(editInvoice?.dueDate?.split('T')[0] || '');
  const [taxRate, setTaxRate] = useState(editInvoice?.taxRate || 0);
  const [notes, setNotes] = useState(editInvoice?.notes || '');
  const [terms, setTerms] = useState(editInvoice?.terms || '');
  const [currency, setCurrency] = useState(editInvoice?.currency || 'USD');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(editInvoice?.lineItems || [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  const [sending, setSending] = useState(false);

  const updateLineItem = useCallback((i: number, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems(prev => {
      const items = prev.map((item, idx) => {
        if (idx !== i) return item;
        const numVal = (field === 'quantity' || field === 'unitPrice') ? Math.max(0, Number(value) || 0) : value;
        const updated = { ...item, [field]: numVal };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.amount = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
        }
        return updated;
      });
      return items;
    });
  }, []);

  const addLine = () => setLineItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  const removeLine = (i: number) => { setLineItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev); };

  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const taxAmount = subtotal * (Number(taxRate) / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientEmail || !dueDate) {
      toast.error('Client name, email, and due date are required');
      return;
    }
    if (!lineItems.some(li => li.description && li.amount > 0)) {
      toast.error('Add at least one line item with a description and amount');
      return;
    }
    setSending(true);
    try {
      const url = editInvoice ? `/api/invoices/${editInvoice._id}` : '/api/invoices';
      const method = editInvoice ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, clientEmail, clientAddress, clientCompanyName, issueDate, dueDate, taxRate: Number(taxRate), notes, terms, currency, lineItems }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editInvoice ? 'Invoice updated' : 'Invoice created');
        onSuccess();
      } else {
        toast.error(json.error || 'Failed to save invoice');
      }
    } catch { toast.error('Failed to save invoice'); }
    setSending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Client Name *</label>
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Acme Corp" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Client Email *</label>
          <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="billing@acme.com" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Company Name</label>
          <Input value={clientCompanyName} onChange={(e) => setClientCompanyName(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Address</label>
          <Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Issue Date *</label>
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Due Date *</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-surface-700">Line Items</label>
          <Button type="button" variant="ghost" size="sm" onClick={addLine}>+ Add Item</Button>
        </div>
        <div className="space-y-2">
          {lineItems.map((li, i) => (
            <div key={i} className="flex items-start gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex-1">
                <Input
                  value={li.description}
                  onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                  placeholder="Description"
                />
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={li.quantity}
                  onChange={(e) => updateLineItem(i, 'quantity', e.target.value)}
                  placeholder="Qty"
                />
              </div>
              <div className="w-28">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={li.unitPrice}
                  onChange={(e) => updateLineItem(i, 'unitPrice', e.target.value)}
                  placeholder="Price"
                />
              </div>
              <div className="w-24 pt-2 text-right text-sm font-mono text-surface-700">
                {getCurrencySymbol(currency)}{li.amount.toFixed(2)}
              </div>
              {lineItems.length > 1 && (
                <button type="button" onClick={() => removeLine(i)} className="pt-2 text-surface-400 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Tax Rate (%)</label>
          <Input type="number" min="0" max="100" step="0.1" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
            {COMMON_CURRENCIES.map((c) => (<option key={c.code} value={c.code}>{c.code} ({c.symbol}) — {c.name}</option>))}
          </select>
        </div>
      </div>

      <div className="border-t border-surface-200 pt-4">
        <div className="text-right space-y-1">
          <p className="text-sm text-surface-500">Subtotal: <span className="font-mono">{getCurrencySymbol(currency)}{subtotal.toFixed(2)}</span></p>
          {taxRate > 0 && <p className="text-sm text-surface-500">Tax ({taxRate}%): <span className="font-mono">{getCurrencySymbol(currency)}{taxAmount.toFixed(2)}</span></p>}
          <p className="text-lg font-bold text-surface-900">Total: <span className="font-mono">{getCurrencySymbol(currency)}{total.toFixed(2)}</span></p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none" placeholder="Optional notes for client" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Payment Terms</label>
          <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none" placeholder="e.g. Net 30" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={sending}>{editInvoice ? 'Update Invoice' : 'Create Invoice'}</Button>
      </div>
    </form>
  );
}
