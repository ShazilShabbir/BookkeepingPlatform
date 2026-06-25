import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name, email, subject, category, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const categoryLabels: Record<string, string> = {
        general: 'General',
        technical: 'Technical',
        billing: 'Billing',
        feature: 'Feature Request',
      };

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'BookKeep Support <noreply@bookkeep.com>',
          to: 'support@bookkeep.com',
          replyTo: email,
          subject: `[${categoryLabels[category] || 'General'}] ${subject}`,
          html: `
            <h2>New Support Message</h2>
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Category:</strong> ${categoryLabels[category] || 'General'}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr />
            <p>${message.replace(/\n/g, '<br/>')}</p>
          `,
        }),
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Support contact error:', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
