import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { getFinancialStatements, generateReportHTML } from '@/lib/reports';
import { generateWorkbook } from '@/lib/excel';
import User from '@/lib/models/User';
import Client from '@/lib/models/Client';
import dbConnect from '@/lib/mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  try {
    const { clientId, startDate, endDate, email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await User.findById(uid).lean();
    const ownerName = (user as any)?.name || 'Business Owner';

    const client = await Client.findOne({ _id: clientId, userId: uid }).lean();
    const shareLink = client ? `${process.env.NEXTAUTH_URL}/reports/${(client as any).accessToken}` : undefined;

    const statements = await getFinancialStatements(uid, startDate, endDate);
    const html = generateReportHTML(statements, ownerName, shareLink);
    const workbook = await generateWorkbook(uid, startDate, endDate);
    const buffer = await workbook.xlsx.writeBuffer();

    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const base64 = buffer.toString('base64');
    const dateLabel = startDate && endDate ? `${startDate} to ${endDate}` : 'All Time';

    await resend.emails.send({
      from: 'BookKeep <onboarding@resend.dev>',
      to: email,
      subject: `Financial Report - ${dateLabel}`,
      html,
      attachments: [{ filename: 'financial-report.xlsx', content: base64, content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }],
    });

    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('send-report error:', e?.message || e);
    return res.status(500).json({ error: e?.message || 'Failed to send report' });
  }
}
