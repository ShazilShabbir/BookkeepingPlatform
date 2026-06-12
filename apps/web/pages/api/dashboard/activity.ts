import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { getAuditLogs } from '@/lib/audit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  try {
    const logs = await getAuditLogs(uid, { limit: 20 });
    return res.status(200).json({ success: true, data: logs });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Internal server error' });
  }
}
