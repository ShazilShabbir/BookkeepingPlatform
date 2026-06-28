import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import TrashItem from '@/lib/models/TrashItem';
import JournalEntry from '@/lib/models/JournalEntry';
import JournalLine from '@/lib/models/JournalLine';
import Account from '@/lib/models/Account';
import { logAction } from '@/lib/audit';
import { requireAuth, checkCsrf } from '@/lib/auth';
import { resolveUserIdFromQuery } from '@/lib/customerContext';

const modelMap: Record<string, any> = {
  entry: JournalEntry,
  account: Account,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ((req.method === 'DELETE' || req.method === 'POST') && !checkCsrf(req, res)) return;

  const token = await requireAuth(req, res);
  if (!token) return;
  const uid = await resolveUserIdFromQuery(token, req);

  try {
    await dbConnect();

    if (req.method === 'GET') {
      const { page = '1', limit = '20' } = req.query;
      const pg = Math.max(1, parseInt(page as string) || 1);
      const lim = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const skip = (pg - 1) * lim;
      const [items, total] = await Promise.all([
        TrashItem.find({ userId: uid }).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
        TrashItem.countDocuments({ userId: uid }),
      ]);
      return res.status(200).json({ success: true, data: items, total, page: pg, pages: Math.ceil(total / lim) });
    }

    if (req.method === 'POST') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });

      const item = await TrashItem.findOne({ _id: id, userId: uid });
      if (!item) return res.status(404).json({ error: 'Trash item not found' });

      const Model = modelMap[item.resource];
      if (!Model) return res.status(400).json({ error: `Cannot restore ${item.resource} items` });

      const restored = await Model.create({ ...item.snapshot, userId: uid, _id: undefined });
      await TrashItem.deleteOne({ _id: item._id });
      await logAction({ userId: uid, action: 'restore', resource: item.resource, resourceId: restored._id.toString(), details: { label: item.label }, req });
      return res.status(200).json({ success: true, data: restored.toObject() });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id || Array.isArray(id)) return res.status(400).json({ error: 'id is required' });

      const item = await TrashItem.findOneAndDelete({ _id: id, userId: uid });
      if (!item) return res.status(404).json({ error: 'Trash item not found' });
      await logAction({ userId: uid, action: 'delete', resource: 'trash', resourceId: id, details: { permanentlyDeleted: true }, req });
      return res.status(200).json({ success: true });
    }
  } catch (e: any) {
    console.error('[trash] error:', e?.message);
    return res.status(500).json({ error: e?.message || 'Internal server error' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
