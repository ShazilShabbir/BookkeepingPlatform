import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { generateWorkbook } from '@/lib/excel';
import { checkFeatureAccess } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  const { allowed } = await checkFeatureAccess(uid!, 'excel-export');
  if (!allowed) return res.status(403).json({ error: 'Excel export requires Pro plan or higher. Visit /pricing to upgrade.', code: 'UPGRADE_REQUIRED' });

  try {
    const { startDate, endDate } = req.body;
    const workbook = await generateWorkbook(uid, startDate, endDate);
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=financial-report.xlsx');
    res.send(buffer);
  } catch (e: any) {
    console.error('export-excel error:', e?.message || e);
    res.status(500).json({ error: 'Internal server error' });
  }
}
