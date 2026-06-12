import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { logAction } from '@/lib/audit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const uid = token.sub!;

    await dbConnect();

    if (req.method === 'GET') {
      const singleUid = req.query.uid as string;
      if (singleUid) {
        const user = await User.findById(singleUid).lean();
        if (!user || (user as any).createdBy !== uid) {
          return res.status(404).json({ error: 'Customer not found' });
        }
        return res.status(200).json({
          success: true,
          data: {
            uid: (user as any)._id.toString(),
            email: (user as any).email || '',
            name: (user as any).name || '',
            createdAt: (user as any).createdAt?.toISOString() || '',
          },
        });
      }

      const customers = await User.find({ createdBy: uid, role: 'customer' }).sort({ name: 1 }).lean();
      const mapped = customers.map(c => ({
        uid: (c as any)._id.toString(),
        email: c.email || '',
        name: c.name || '',
        createdAt: c.createdAt?.toISOString() || '',
      }));
      return res.status(200).json({ success: true, data: mapped });
    }

    if (req.method === 'POST') {
      const { name, email } = req.body;
      if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(409).json({ error: 'Email already in use' });

      const hashedPassword = await bcrypt.hash('temporary123', 12);
      const customer = await User.create({
        email,
        name,
        password: hashedPassword,
        role: 'customer',
        createdBy: uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await logAction({ userId: uid, action: 'create', resource: 'customer', resourceId: customer._id.toString(), details: { name, email }, req });
      return res.status(201).json({
        success: true,
        data: { uid: customer._id.toString(), email, name },
      });
    }

    if (req.method === 'PUT') {
      const { customerUid, csvMapping, customFields } = req.body;
      if (!customerUid) return res.status(400).json({ error: 'customerUid is required' });

      const customer = await User.findById(customerUid);
      if (!customer || (customer as any).createdBy !== uid) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const update: Record<string, any> = { updatedAt: new Date() };
      if (csvMapping !== undefined) update.csvMapping = csvMapping;
      if (customFields !== undefined) update.customFields = customFields;
      await User.findByIdAndUpdate(customerUid, { $set: update });

      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { customerUid } = req.body;
      if (!customerUid) return res.status(400).json({ error: 'customerUid is required' });

      const customer = await User.findById(customerUid);
      if (!customer || (customer as any).createdBy !== uid) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      await User.findByIdAndDelete(customerUid);
      await logAction({ userId: uid, action: 'delete', resource: 'customer', resourceId: customerUid, req });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('customers error:', e?.message || e);
    if (e?.code === 11000) return res.status(409).json({ error: 'Email already in use' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
