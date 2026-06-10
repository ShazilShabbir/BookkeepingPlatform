import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import ImportJob from '@/lib/models/ImportJob';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  try {
    const { fileName, content, mapping, aiMappings, dedupEnabled } = req.body;
    if (!fileName || !content) return res.status(400).json({ error: 'fileName and content are required' });

    const uploadDir = path.join(process.cwd(), 'uploads', uid);
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, `${Date.now()}-${fileName}`);
    writeFileSync(filePath, content, 'utf-8');

    const job = await ImportJob.create({
      userId: uid,
      originalFileName: fileName,
      filePath,
      status: 'pending',
      totalRows: 0,
      processedRows: 0,
      mapping: mapping || {},
      aiMappings: aiMappings || {},
      dedupEnabled: dedupEnabled !== false,
    });

    return res.status(201).json({ success: true, data: { jobId: job._id.toString(), fileName, status: 'pending' } });
  } catch (e: any) {
    console.error('upload-import error:', e?.message || e);
    return res.status(500).json({ error: e?.message || 'Upload failed' });
  }
}
