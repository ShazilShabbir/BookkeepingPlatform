import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import Account from '@/lib/models/Account';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const uid = token.sub!;

  await dbConnect();

  if (req.method === 'GET') {
    const accounts = await Account.find({ userId: uid, isActive: true }).sort({ code: 1 }).lean();
    return res.status(200).json({ success: true, data: accounts });
  }

  if (req.method === 'POST') {
    const { code, name, type, normalBalance } = req.body;
    if (!code || !name || !type) return res.status(400).json({ error: 'code, name, and type are required' });

    const existing = await Account.findOne({ userId: uid, code });
    if (existing) return res.status(409).json({ error: 'Account code already exists' });

    const account = await Account.create({
      userId: uid,
      code,
      name,
      type,
      normalBalance: normalBalance || 'debit',
      isActive: true,
    });
    return res.status(201).json({ success: true, data: account.toObject() });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
