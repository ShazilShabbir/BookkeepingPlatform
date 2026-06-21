import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import Invoice from '@/lib/models/Invoice';
import { requireAuth, checkCsrf } from '@/lib/auth';
import { resolveUserIdFromQuery } from '@/lib/customerContext';
import { checkFeatureAccess } from '@/lib/subscription';
import { logAction } from '@/lib/audit';
import { generateInvoiceNumber } from '@/lib/invoiceNumber';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ((req.method === 'POST' || req.method === 'DELETE') && !checkCsrf(req, res)) return;
  const token = await requireAuth(req, res);
  if (!token) return;
  const uid = await resolveUserIdFromQuery(token, req);

  await dbConnect();

  if (req.method === 'POST') {
    const { allowed } = await checkFeatureAccess(uid!, 'invoicing');
    if (!allowed) return res.status(403).json({ error: 'Invoicing requires Pro plan or higher. Visit /pricing to upgrade.', code: 'UPGRADE_REQUIRED' });
  }

  if (req.method === 'GET') {
    const { status, search, page = '1', limit = '50' } = req.query;
    const filter: any = { userId: uid };
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search as string, $options: 'i' } },
        { clientName: { $regex: search as string, $options: 'i' } },
        { clientEmail: { $regex: search as string, $options: 'i' } },
      ];
    }
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;
    const [invoices, total] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Invoice.countDocuments(filter),
    ]);
    return res.status(200).json({ success: true, data: invoices, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  }

  if (req.method === 'POST') {
    const { clientName, clientEmail, clientAddress, clientCompanyName, clientId, issueDate, dueDate, lineItems, taxRate, notes, terms, currency } = req.body;
    if (!clientName || !clientEmail || !issueDate || !dueDate || !lineItems?.length) {
      return res.status(400).json({ error: 'Missing required fields: clientName, clientEmail, issueDate, dueDate, lineItems' });
    }
    const items = lineItems.map((li: any) => ({
      description: li.description,
      quantity: Number(li.quantity) || 1,
      unitPrice: Number(li.unitPrice) || 0,
      amount: (Number(li.quantity) || 1) * (Number(li.unitPrice) || 0),
      accountCode: li.accountCode,
    }));
    const subtotal = items.reduce((s: number, li: any) => s + li.amount, 0);
    const taxRateNum = Number(taxRate) || 0;
    const taxAmount = subtotal * (taxRateNum / 100);
    const total = subtotal + taxAmount;
    const invoiceNumber = await generateInvoiceNumber(uid);
    const invoice = await Invoice.create({
      userId: uid,
      invoiceNumber,
      clientName,
      clientEmail,
      clientAddress,
      clientCompanyName,
      clientId,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      lineItems: items,
      subtotal,
      taxRate: taxRateNum,
      taxAmount,
      total,
      currency: currency || 'USD',
      notes,
      terms,
    });
    await logAction({ userId: uid, action: 'create', resource: 'invoice', resourceId: invoice._id.toString(), details: { invoiceNumber }, req });
    return res.status(201).json({ success: true, data: invoice.toObject() });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
