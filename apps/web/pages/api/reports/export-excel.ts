import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { generateWorkbook } from '@/lib/excel';
import { checkFeatureAccess } from '@/lib/subscription';
import { resolveUserId } from '@/lib/customerContext';
import { rateLimit } from '@/lib/rateLimit';
import dbConnect from '@/lib/mongoose';

const exportExcelLimiter = rateLimit({ interval: 60 * 1000, max: 5 });
import User from '@/lib/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = await resolveUserId(token, req.body.userId);

  const { allowed: rateAllowed } = exportExcelLimiter(uid!);
  if (!rateAllowed) return res.status(429).json({ error: 'Too many requests. Please wait before exporting again.' });

  if (process.env.NODE_ENV !== 'development') {
    const { allowed } = await checkFeatureAccess(uid!, 'excel-export');
    if (!allowed) return res.status(403).json({ error: 'Excel export requires Pro plan or higher. Visit /pricing to upgrade.', code: 'UPGRADE_REQUIRED' });
  }

  try {
    const { startDate, endDate } = req.body;
    await dbConnect();
    const user = await User.findById(uid).select('brandingPrimaryColor brandingCompanyName baseCurrency').lean();
    const branding = user ? { primaryColor: (user as any).brandingPrimaryColor, companyName: (user as any).brandingCompanyName } : undefined;
    const baseCurrency = (user as any)?.baseCurrency || 'USD';
    const workbook = await generateWorkbook(uid, startDate, endDate, branding, baseCurrency);
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=financial-report.xlsx');
    res.send(buffer);
  } catch (e: any) {
    console.error('[export-excel] error:', {
      name: e?.name,
      message: e?.message,
      stack: e?.stack?.split('\n').slice(0, 6).join('\n'),
    });
    const isDev = process.env.NODE_ENV === 'development';
    const detail = isDev ? `${e?.name}: ${e?.message}` : 'Internal server error';
    console.error(detail);
    res.status(500).json({ error: detail });
  }
}
