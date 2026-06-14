import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { getFinancialStatements } from '@/lib/reports';
import { resolveUserIdFromQuery } from '@/lib/customerContext';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = await resolveUserIdFromQuery(token, req);

  try {
    const { startDate, endDate } = req.query;
    const statements = await getFinancialStatements(uid, startDate as string, endDate as string);
    return res.status(200).json({ success: true, data: statements });
  } catch (e: any) {
    console.error('financial-statements error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
