import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import ImportJob from '@/lib/models/ImportJob';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  if (req.method === 'GET') {
    const jobs = await ImportJob.find({ userId: uid }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: jobs });
  }

  if (req.method === 'POST') {
    const { originalFileName, totalRows } = req.body;
    const job = await ImportJob.create({
      userId: uid,
      originalFileName: originalFileName || 'untitled.csv',
      status: 'pending',
      totalRows: totalRows || 0,
      processedRows: 0,
    });
    return res.status(201).json({ success: true, data: job.toObject() });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
