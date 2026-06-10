import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import Account from '@/lib/models/Account';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  const { code } = req.query;
  if (!code || Array.isArray(code)) return res.status(400).json({ error: 'Invalid account code' });

  if (req.method === 'GET') {
    const account = await Account.findOne({ userId: uid, code }).lean();
    if (!account) return res.status(404).json({ error: 'Account not found' });
    return res.status(200).json({ success: true, data: account });
  }

  if (req.method === 'PUT') {
    const { name, type, normalBalance, isActive } = req.body;
    const update: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (type !== undefined) update.type = type;
    if (normalBalance !== undefined) update.normalBalance = normalBalance;
    if (isActive !== undefined) update.isActive = isActive;

    const account = await Account.findOneAndUpdate(
      { userId: uid, code },
      { $set: update },
      { new: true }
    ).lean();
    if (!account) return res.status(404).json({ error: 'Account not found' });
    return res.status(200).json({ success: true, data: account });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
