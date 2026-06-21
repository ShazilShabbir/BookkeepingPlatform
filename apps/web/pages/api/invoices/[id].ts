import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import Invoice from '@/lib/models/Invoice';
import { requireAuth, checkCsrf } from '@/lib/auth';
import { resolveUserIdFromQuery } from '@/lib/customerContext';
import { logAction } from '@/lib/audit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ((req.method === 'PUT' || req.method === 'DELETE' || req.method === 'POST') && !checkCsrf(req, res)) return;
  const token = await requireAuth(req, res);
  if (!token) return;
  const uid = await resolveUserIdFromQuery(token, req);

  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'id is required' });

  await dbConnect();

  if (req.method === 'GET') {
    const invoice = await Invoice.findOne({ _id: id, userId: uid }).lean();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return res.status(200).json({ success: true, data: invoice });
  }

  if (req.method === 'PUT') {
    const invoice = await Invoice.findOne({ _id: id, userId: uid });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return res.status(400).json({ error: `Cannot update a ${invoice.status} invoice` });
    }
    const { clientName, clientEmail, clientAddress, clientCompanyName, issueDate, dueDate, lineItems, taxRate, notes, terms, currency, status } = req.body;
    if (clientName !== undefined) invoice.clientName = clientName;
    if (clientEmail !== undefined) invoice.clientEmail = clientEmail;
    if (clientAddress !== undefined) invoice.clientAddress = clientAddress;
    if (clientCompanyName !== undefined) invoice.clientCompanyName = clientCompanyName;
    if (issueDate) invoice.issueDate = new Date(issueDate);
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (taxRate !== undefined) invoice.taxRate = Number(taxRate);
    if (notes !== undefined) invoice.notes = notes;
    if (terms !== undefined) invoice.terms = terms;
    if (currency !== undefined) invoice.currency = currency;
    if (status && ['draft', 'sent', 'cancelled'].includes(status)) {
      invoice.status = status;
      if (status === 'sent') invoice.sentAt = new Date();
    }
    if (lineItems?.length) {
      const items = lineItems.map((li: any) => ({
        description: li.description,
        quantity: Number(li.quantity) || 1,
        unitPrice: Number(li.unitPrice) || 0,
        amount: (Number(li.quantity) || 1) * (Number(li.unitPrice) || 0),
        accountCode: li.accountCode,
      }));
      invoice.lineItems = items as any;
      invoice.subtotal = items.reduce((s: number, li: any) => s + li.amount, 0);
      invoice.taxAmount = invoice.subtotal * (invoice.taxRate / 100);
      invoice.total = invoice.subtotal + invoice.taxAmount;
    }
    await invoice.save();
    await logAction({ userId: uid, action: 'update', resource: 'invoice', resourceId: id as string, details: { invoiceNumber: invoice.invoiceNumber }, req });
    return res.status(200).json({ success: true, data: invoice.toObject() });
  }

  if (req.method === 'DELETE') {
    const invoice = await Invoice.findOneAndDelete({ _id: id, userId: uid });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    await logAction({ userId: uid, action: 'delete', resource: 'invoice', resourceId: id as string, details: { invoiceNumber: invoice.invoiceNumber }, req });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
