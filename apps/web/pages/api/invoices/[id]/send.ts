import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import Invoice from '@/lib/models/Invoice';
import { requireAuth, checkCsrf } from '@/lib/auth';
import { resolveUserIdFromQuery } from '@/lib/customerContext';
import { logAction } from '@/lib/audit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkCsrf(req, res)) return;
  const token = await requireAuth(req, res);
  if (!token) return;
  const uid = await resolveUserIdFromQuery(token, req);

  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'id is required' });

  await dbConnect();
  const invoice = await Invoice.findOne({ _id: id, userId: uid });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status === 'cancelled') return res.status(400).json({ error: 'Cannot send a cancelled invoice' });

  const pdfRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/invoices/${id}/pdf`);
  let pdfBase64 = '';
  if (pdfRes.ok) {
    const pdfBuf = await pdfRes.arrayBuffer();
    pdfBase64 = Buffer.from(pdfBuf).toString('base64');
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'BookKeep <onboarding@resend.dev>',
      to: invoice.clientEmail,
      subject: `Invoice ${invoice.invoiceNumber} from BookKeep`,
      html: getInvoiceEmailHtml(invoice),
      attachments: pdfBase64 ? [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBase64, content_type: 'application/pdf' }] : undefined,
    });
    invoice.status = 'sent';
    invoice.sentAt = new Date();
    await invoice.save();
    await logAction({ userId: uid, action: 'send', resource: 'invoice', resourceId: id as string, details: { invoiceNumber: invoice.invoiceNumber, sentTo: invoice.clientEmail }, req });
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('Failed to send invoice email:', e?.message || e);
    return res.status(500).json({ error: 'Failed to send email. Check RESEND_API_KEY.' });
  }
}

function getInvoiceEmailHtml(invoice: any): string {
  const dueStr = new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #4f46e5; padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Invoice ${invoice.invoiceNumber}</h1>
      </div>
      <div style="padding: 32px; background: #fff;">
        <p style="color: #374151; font-size: 16px;">Hi <strong>${invoice.clientName}</strong>,</p>
        <p style="color: #6b7280; font-size: 15px;">You have a new invoice from BookKeep for <strong>$${invoice.total.toFixed(2)}</strong>, due on <strong>${dueStr}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr style="background: #f9fafb;">
            <th style="text-align: left; padding: 10px 12px; font-size: 13px; color: #6b7280;">Description</th>
            <th style="text-align: right; padding: 10px 12px; font-size: 13px; color: #6b7280;">Qty</th>
            <th style="text-align: right; padding: 10px 12px; font-size: 13px; color: #6b7280;">Amount</th>
          </tr>
          ${invoice.lineItems.map((li: any) => `
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 10px 12px; font-size: 14px; color: #374151;">${li.description}</td>
              <td style="padding: 10px 12px; font-size: 14px; color: #374151; text-align: right;">${li.quantity}</td>
              <td style="padding: 10px 12px; font-size: 14px; color: #374151; text-align: right;">$${li.amount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>
        <div style="border-top: 2px solid #f3f4f6; padding-top: 16px; text-align: right;">
          ${invoice.taxRate > 0 ? `<p style="margin: 4px 0; color: #6b7280;">Subtotal: $${invoice.subtotal.toFixed(2)}</p><p style="margin: 4px 0; color: #6b7280;">Tax (${invoice.taxRate}%): $${invoice.taxAmount.toFixed(2)}</p>` : ''}
          <p style="margin: 4px 0; font-size: 20px; font-weight: 700; color: #111827;">Total: $${invoice.total.toFixed(2)}</p>
        </div>
      </div>
      <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
        <p>BookKeep — Sales Analytics Made Simple</p>
      </div>
    </div>
  `;
}
