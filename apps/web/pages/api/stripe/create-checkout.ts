import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { stripe } from '@/lib/stripe';
import { TIERS, Tier } from '@/lib/tiers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  try {
    const { tier, interval } = req.body;
    if (!tier || !['pro', 'business'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier. Choose pro or business.' });
    }
    if (!interval || !['month', 'year'].includes(interval)) {
      return res.status(400).json({ error: 'Invalid interval. Choose month or year.' });
    }

    const user = await User.findById(uid).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const config = TIERS[tier as Tier];
    const priceId = interval === 'month' ? config.stripePriceIdMonthly : config.stripePriceIdYearly;

    if (!priceId) {
      return res.status(500).json({ error: 'Stripe price not configured. Set up prices in Stripe dashboard.' });
    }

    let customerId = (user as any).stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: (user as any).email,
        name: (user as any).name,
        metadata: { userId: uid },
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(uid, { stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      metadata: { userId: uid, tier, interval },
      subscription_data: {
        metadata: { userId: uid, tier },
      },
    });

    return res.status(200).json({ success: true, url: session.url });
  } catch (e: any) {
    console.error('create-checkout error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
