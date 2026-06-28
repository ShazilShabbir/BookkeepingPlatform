import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongoose';
import User, { IUser } from '@/lib/models/User';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  companyName: z.string().max(200).optional(),
  baseCurrency: z.string().min(3).max(3).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return res.status(400).json({ error: `${first.path.join('.')}: ${first.message}` });
  }

  try {
    await dbConnect();

    const updates: Record<string, string> = {};
    if (parsed.data.name) updates.name = parsed.data.name;
    if (parsed.data.email) updates.email = parsed.data.email.toLowerCase();
    if (parsed.data.companyName !== undefined) updates.companyName = parsed.data.companyName;
    if (parsed.data.baseCurrency) updates.baseCurrency = parsed.data.baseCurrency.toUpperCase();

    if (updates.email) {
      const existing = await User.findOne({ email: updates.email, _id: { $ne: session.user.id } });
      if (existing) return res.status(409).json({ error: 'Email already in use' });
    }

    const user = await User.findByIdAndUpdate(session.user.id, { $set: updates }, { new: true }).lean() as IUser | null;
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        companyName: user.companyName,
        baseCurrency: (user as any).baseCurrency || 'USD',
      },
    });
  } catch (e: any) {
    console.error('profile update error:', e?.message || e);
    if (e?.code === 11000) return res.status(409).json({ error: 'Email already in use' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
