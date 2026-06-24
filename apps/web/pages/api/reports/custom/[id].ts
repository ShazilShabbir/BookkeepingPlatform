import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import CustomReport from '@/lib/models/CustomReport';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub as string;

  await dbConnect();

  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required' });

  try {
    if (req.method === 'GET') {
      const report = await CustomReport.findOne({ _id: id, userId: uid }).lean();
      if (!report) return res.status(404).json({ error: 'Report not found' });
      return res.status(200).json({ success: true, data: { _id: (report as any)._id.toString(), name: report.name, sections: report.sections, filters: report.filters } });
    }

    if (req.method === 'PUT') {
      const { name, sections, filters } = req.body;
      const update: Record<string, any> = {};
      if (name !== undefined) update.name = name.trim();
      if (sections !== undefined) update.sections = sections;
      if (filters !== undefined) update.filters = filters;

      const report = await CustomReport.findOneAndUpdate({ _id: id, userId: uid }, update, { new: true }).lean();
      if (!report) return res.status(404).json({ error: 'Report not found' });
      return res.status(200).json({ success: true, data: { _id: (report as any)._id.toString(), name: report.name, sections: report.sections, filters: report.filters } });
    }

    if (req.method === 'DELETE') {
      const result = await CustomReport.findOneAndDelete({ _id: id, userId: uid });
      if (!result) return res.status(404).json({ error: 'Report not found' });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('custom report detail error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
