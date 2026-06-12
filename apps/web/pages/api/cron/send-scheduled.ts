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

    for (const schedule of schedules) {
      try {
        const user = await User.findById((schedule as any).userId).lean();
        if (!user) continue;
        const ownerName = (user as any)?.name || 'Business Owner';

        const client = await Client.findOne({ _id: (schedule as any).clientId }).lean();
        const shareLink = client ? `${process.env.NEXTAUTH_URL}/reports/${(client as any).accessToken}` : undefined;

        const statements = await getFinancialStatements((schedule as any).userId);
        const html = generateReportHTML(statements, ownerName, shareLink);

        await (resend.emails.send as any)({
          from: 'BookKeep <onboarding@resend.dev>',
          to: (user as any).email,
          subject: `Scheduled Financial Report - ${(schedule as any).frequency}`,
          html,
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
