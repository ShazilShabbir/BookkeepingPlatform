import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { z } from 'zod';
import { passwordSchema } from '@/lib/validate';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return res.status(400).json({ error: `${first.path.join('.')}: ${first.message}` });
  }

  try {
    await dbConnect();

    const user = await User.findById(session.user.id).select('+password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!isValid) return res.status(400).json({ error: 'currentPassword: Current password is incorrect' });

    user.password = await bcrypt.hash(parsed.data.newPassword, 12);
    await user.save();

    return res.json({ success: true });
  } catch (e: any) {
    console.error('password change error:', e?.message || e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
