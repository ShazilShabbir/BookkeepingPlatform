import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { checkFeatureAccess } from '@/lib/subscription';
import { resolveUserIdFromQuery } from '@/lib/customerContext';
import { generateCashFlowReport } from '@/lib/reports';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = await resolveUserIdFromQuery(token, req);

  const { allowed } = await checkFeatureAccess(uid!, 'cash-flow');
  if (!allowed) return res.status(403).json({ error: 'Cash Flow requires Pro plan or higher. Visit /pricing to upgrade.', code: 'UPGRADE_REQUIRED' });

  try {
    const { startDate, endDate } = req.query;
    await dbConnect();
    const userDoc = await User.findById(uid).select('baseCurrency').lean() as any;
    const baseCurrency = userDoc?.baseCurrency || 'USD';
    const report = await generateCashFlowReport(
      uid!,
      startDate as string || null,
      endDate as string || null,
      baseCurrency,
    );

    return res.status(200).json({ success: true, data: { ...report, baseCurrency } });
  } catch (e: any) {
    console.error('cash-flow error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
