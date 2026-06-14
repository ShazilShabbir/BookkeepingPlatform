import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import TrashItem from '@/lib/models/TrashItem';
import { logAction } from '@/lib/audit';
import { requireAuth, checkCsrf } from '@/lib/auth';
import { resolveUserIdFromQuery } from '@/lib/customerContext';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE' && !checkCsrf(req, res)) return;

  const token = await requireAuth(req, res);
  if (!token) return;
  const uid = await resolveUserIdFromQuery(token, req);

  await dbConnect();

  if (req.method === 'GET') {
    const items = await TrashItem.find({ userId: uid }).sort({ createdAt: -1 }).limit(100).lean();
    return res.status(200).json({ success: true, data: items });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id || Array.isArray(id)) return res.status(400).json({ error: 'id is required' });

    const item = await TrashItem.findOneAndDelete({ _id: id, userId: uid });
    if (!item) return res.status(404).json({ error: 'Trash item not found' });
    await logAction({ userId: uid, action: 'delete', resource: 'trash', resourceId: id, details: { permanentlyDeleted: true }, req });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
