import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import Invoice from '@/lib/models/Invoice';
import { requireAuth, checkCsrf } from '@/lib/auth';
import { resolveUserIdFromQuery } from '@/lib/customerContext';
import { stripe } from '@/lib/stripe';
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
  if (invoice.status === 'paid') return res.status(400).json({ error: 'Invoice is already paid' });
  if (invoice.status === 'cancelled') return res.status(400).json({ error: 'Cannot pay a cancelled invoice' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: `${invoice.lineItems.length} item(s) — ${invoice.clientName}`,
            },
            unit_amount: Math.round(invoice.total * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId: invoice._id.toString(),
        userId: uid,
        invoiceNumber: invoice.invoiceNumber,
      },
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard?tab=invoices&paid=${invoice._id}`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard?tab=invoices`,
    });

    invoice.stripePaymentLink = session.url;
    invoice.stripePaymentIntentId = session.payment_intent as string;
    await invoice.save();

    await logAction({ userId: uid, action: 'create_payment_link', resource: 'invoice', resourceId: id as string, details: { invoiceNumber: invoice.invoiceNumber }, req });
    return res.status(200).json({ success: true, data: { url: session.url } });
  } catch (e: any) {
    console.error('Failed to create payment session:', e?.message || e);
    return res.status(500).json({ error: 'Failed to create payment link' });
  }
}
