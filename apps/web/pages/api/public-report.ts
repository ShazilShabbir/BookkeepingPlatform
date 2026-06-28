import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import Client from '@/lib/models/Client';
import User from '@/lib/models/User';
import { getFinancialStatements } from '@/lib/reports';
import { generateWorkbook } from '@/lib/excel';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.query.token as string;
  if (!token) return res.status(400).json({ error: 'token is required' });

  await dbConnect();

  try {
    const client = await Client.findOne({ accessToken: token }).lean();
    if (!client) return res.status(404).json({ error: 'Invalid or expired share link' });

    const uid = (client as any).userId;
    const { startDate, endDate, type, download } = req.query;

    if (download === 'excel') {
      const user = await User.findById(uid).select('brandingPrimaryColor brandingCompanyName baseCurrency').lean();
      const branding = user ? { primaryColor: (user as any).brandingPrimaryColor, companyName: (user as any).brandingCompanyName } : undefined;
      const workbook = await generateWorkbook(uid, startDate as string, endDate as string, branding, (user as any)?.baseCurrency || 'USD');
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=financial-report.xlsx');
      return res.send(buffer);
    }

    const statements = await getFinancialStatements(uid, startDate as string, endDate as string, ((await User.findById(uid).lean().catch(() => null)) as any)?.baseCurrency || 'USD');
    const { profitLoss, balanceSheet, cashFlow } = statements as any;

    return res.status(200).json({
      success: true,
      data: {
        clientName: (client as any).name,
        profitLoss,
        balanceSheet,
        cashFlow: cashFlow || { sections: [], totalChange: 0 },
        dateRange: { startDate: startDate || null, endDate: endDate || null },
      },
    });
  } catch (e: any) {
    console.error('public-report error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
