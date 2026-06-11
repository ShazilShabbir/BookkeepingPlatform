import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { stripe } from '@/lib/stripe';

export const config = { api: { bodyParser: false } };

async function buffer(readable: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sig = req.headers['stripe-signature'] as string;
  const rawBody = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    console.error('Webhook signature verification failed:', e?.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  await dbConnect();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const uid = session.metadata?.userId;
        const tier = session.metadata?.tier || 'pro';
        if (uid) {
          await User.findByIdAndUpdate(uid, {
            subscriptionTier: tier,
            subscriptionStatus: 'active',
            subscriptionId: session.subscription,
            currentPeriodEnd: new Date(session.expires_at * 1000),
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        const uid2 = sub.metadata?.userId;
        if (uid2) {
          await User.findByIdAndUpdate(uid2, {
            subscriptionStatus: sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'canceled',
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub2 = event.data.object as any;
        const uid3 = sub2.metadata?.userId;
        if (uid3) {
          await User.findByIdAndUpdate(uid3, {
            subscriptionTier: 'free',
            subscriptionStatus: 'free',
            subscriptionId: '',
            currentPeriodEnd: null,
          });
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        const uid4 = invoice.metadata?.userId || invoice.subscription_details?.metadata?.userId;
        if (uid4 && invoice.period_end) {
          await User.findByIdAndUpdate(uid4, {
            currentPeriodEnd: new Date(invoice.period_end * 1000),
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as any;
        const uid5 = inv.metadata?.userId || inv.subscription_details?.metadata?.userId;
        if (uid5) {
          await User.findByIdAndUpdate(uid5, { subscriptionStatus: 'past_due' });
        }
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (e: any) {
    console.error('webhook handler error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
