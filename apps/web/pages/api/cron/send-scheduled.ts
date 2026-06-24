import { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';
import dbConnect from '@/lib/mongoose';
import ReportSchedule from '@/lib/models/ReportSchedule';
import { getFinancialStatements, generateReportHTML } from '@/lib/reports';
import { generateWorkbook } from '@/lib/excel';
import User from '@/lib/models/User';
import Client from '@/lib/models/Client';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || !process.env.CRON_SECRET || !safeCompare(token, process.env.CRON_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();

  try {
    const now = new Date();
    const schedules = await ReportSchedule.find({ nextRunAt: { $lte: now } }).lean();

    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    let sent = 0;

    const userIds = [...new Set(schedules.map(s => (s as any).userId))];
    const clientIds = schedules.map(s => (s as any).clientId).filter(Boolean);
    const [users, clients] = await Promise.all([
      User.find({ _id: { $in: userIds } }).lean(),
      Client.find({ _id: { $in: clientIds } }).lean(),
    ]);
    const userMap = new Map(users.map(u => [(u as any)._id.toString(), u]));
    const clientMap = new Map(clients.map(c => [(c as any)._id.toString(), c]));

    for (const schedule of schedules) {
      try {
        const user = userMap.get((schedule as any).userId);
        if (!user) continue;
        const ownerName = (user as any)?.name || 'Business Owner';
        const branding = { logo: (user as any).brandingLogo, primaryColor: (user as any).brandingPrimaryColor, companyName: (user as any).brandingCompanyName };

        const client = (schedule as any).clientId ? clientMap.get((schedule as any).clientId) : null;
        const shareLink = client ? `${process.env.NEXTAUTH_URL}/reports/${(client as any).accessToken}` : undefined;

        const statements = await getFinancialStatements((schedule as any).userId);
        const html = generateReportHTML(statements, ownerName, shareLink, branding);
        const workbook = await generateWorkbook((schedule as any).userId, undefined, undefined, branding);
        const buffer = await workbook.xlsx.writeBuffer();
        const base64 = (buffer as any).toString('base64');

        await (resend.emails.send as any)({
          from: 'BookKeep <onboarding@resend.dev>',
          to: (user as any).email,
          subject: `Scheduled Financial Report - ${(schedule as any).frequency}`,
          html,
          attachments: [{ filename: 'financial-report.xlsx', content: base64, content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }],
        });
        sent++;
      } catch (e) {
        console.error('Failed to send scheduled report:', e);
      }
    }

    return res.status(200).json({ success: true, sent });
  } catch (e: any) {
    console.error('cron/send-scheduled error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
