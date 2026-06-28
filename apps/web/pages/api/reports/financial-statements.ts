import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { getFinancialStatements } from '@/lib/reports';
import { resolveUserIdFromQuery } from '@/lib/customerContext';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = await resolveUserIdFromQuery(token, req);

  try {
    const { startDate, endDate } = req.query;
    await dbConnect();
    const user = await User.findById(uid).select('baseCurrency').lean() as any;
    const baseCurrency = user?.baseCurrency || 'USD';
    const statements = await getFinancialStatements(uid, startDate as string, endDate as string, baseCurrency);
    return res.status(200).json({ success: true, data: { ...statements, baseCurrency } });
  } catch (e: any) {
    console.error('financial-statements error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
