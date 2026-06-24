import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import CustomReport from '@/lib/models/CustomReport';
import { checkFeatureAccess } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub as string;

  const { allowed } = await checkFeatureAccess(uid, 'custom-reports');
  if (!allowed) return res.status(403).json({ error: 'Custom reports require Pro plan or higher.', code: 'UPGRADE_REQUIRED' });

  await dbConnect();

  try {
    if (req.method === 'GET') {
      const reports = await CustomReport.find({ userId: uid }).sort({ updatedAt: -1 }).lean();
      return res.status(200).json({ success: true, data: reports.map(r => ({ _id: (r as any)._id.toString(), name: r.name, sections: r.sections, filters: r.filters, createdAt: r.createdAt, updatedAt: r.updatedAt })) });
    }

    if (req.method === 'POST') {
      const { name, sections, filters } = req.body;
      if (!name) return res.status(400).json({ error: 'name required' });

      const report = await CustomReport.create({ userId: uid, name: name.trim(), sections: sections || [], filters: filters || {} });
      return res.status(201).json({ success: true, data: { _id: (report as any)._id.toString(), name: report.name, sections: report.sections, filters: report.filters } });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('custom reports error:', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
