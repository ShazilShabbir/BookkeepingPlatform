import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { stripe } from '@/lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  try {
    const user = await User.findById(uid).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customerId = (user as any).stripeCustomerId;
    if (!customerId) {
      return res.status(400).json({ error: 'No Stripe customer found. Have you subscribed?' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXTAUTH_URL}/billing`,
    });

    return res.status(200).json({ success: true, url: session.url });
  } catch (e: any) {
    console.error('create-portal error:', e?.message || e);
    return res.status(500).json({ error: e?.message || 'Internal server error' });
  }
}
