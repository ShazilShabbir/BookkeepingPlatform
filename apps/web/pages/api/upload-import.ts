import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import ImportJob from '@/lib/models/ImportJob';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { resolveUserId } from '@/lib/customerContext';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

function isAllowedFileType(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return ['.csv', '.tsv'].includes(ext);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = await resolveUserId(token, req.body.userId);

  await dbConnect();

  try {
    const { fileName, content, mapping, csvMapping, csvProfileName, customFieldMapping, aiMappings, dedupEnabled } = req.body;
    if (!fileName || !content) return res.status(400).json({ error: 'fileName and content are required' });

    if (!isAllowedFileType(fileName)) {
      return res.status(400).json({ error: 'Only .csv and .tsv files are allowed' });
    }

    if (typeof content !== 'string' || content.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File content exceeds maximum size' });
    }

    const safeName = sanitizeFileName(fileName);
    const uploadDir = path.join(process.cwd(), 'uploads', uid);
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, `${Date.now()}-${safeName}`);
    writeFileSync(filePath, content, 'utf-8');

    const job = await ImportJob.create({
      userId: uid,
      originalFileName: safeName,
      filePath,
      status: 'pending',
      totalRows: 0,
      processedRows: 0,
      mapping: mapping || {},
      csvMapping: csvMapping || null,
      csvProfileName: csvProfileName || null,
      customFieldMapping: customFieldMapping || null,
      aiMappings: aiMappings || {},
      dedupEnabled: dedupEnabled !== false,
    });

    return res.status(201).json({ success: true, data: { jobId: job._id.toString(), fileName: safeName, status: 'pending' } });
  } catch (e: any) {
    console.error('upload-import error:', e?.message || e);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
