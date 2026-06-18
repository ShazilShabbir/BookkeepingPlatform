import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { parsePdfBuffer } = await import('@/lib/pdf-import');
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const result = await parsePdfBuffer(buffer);
    return res.status(200).json({ success: true, data: result });
  } catch (e: any) {
    return res.status(400).json({ success: false, error: e.message || 'PDF parsing failed' });
  }
}
