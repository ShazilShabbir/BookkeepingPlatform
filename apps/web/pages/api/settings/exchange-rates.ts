import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import ExchangeRate from '@/lib/models/ExchangeRate';
import User from '@/lib/models/User';
import { checkFeatureAccess } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const uid = token.sub!;

    const { allowed } = await checkFeatureAccess(uid, 'multi-currency');
    if (!allowed) return res.status(403).json({ error: 'Multi-currency requires Pro plan or higher.', code: 'UPGRADE_REQUIRED' });

    await dbConnect();

    const userDoc = await User.findById(uid).select('baseCurrency').lean() as any;
    const baseCurrency = userDoc?.baseCurrency || 'USD';

    if (req.method === 'GET') {
      const rates = await ExchangeRate.find({ userId: uid, baseCurrency }).sort({ targetCurrency: 1, date: -1 }).lean();
      const grouped: Record<string, { rate: number; date: string; source: string }> = {};
      for (const r of rates) {
        const key = (r as any).targetCurrency;
        if (!grouped[key]) {
          grouped[key] = { rate: (r as any).rate, date: (r as any).date?.toISOString?.() || (r as any).date, source: (r as any).source };
        }
      }
      return res.status(200).json({ success: true, data: grouped, baseCurrency });
    }

    if (req.method === 'PUT') {
      const { targetCurrency, rate, date } = req.body;
      if (!targetCurrency || rate == null) return res.status(400).json({ error: 'targetCurrency and rate are required' });

      const existing = await ExchangeRate.findOne({ userId: uid, targetCurrency, baseCurrency });
      if (existing) {
        existing.rate = rate;
        existing.date = date ? new Date(date) : new Date();
        existing.source = 'manual';
        await existing.save();
      } else {
        await ExchangeRate.create({
          userId: uid,
          baseCurrency,
          targetCurrency: targetCurrency.toUpperCase(),
          rate,
          date: date ? new Date(date) : new Date(),
          source: 'manual',
        });
      }

      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { targetCurrency } = req.body;
      if (!targetCurrency) return res.status(400).json({ error: 'targetCurrency is required' });
      await ExchangeRate.deleteMany({ userId: uid, targetCurrency, baseCurrency });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('exchange-rates error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
