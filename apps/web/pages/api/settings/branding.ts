import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { requireAuth, checkCsrf } from '@/lib/auth';
import { resolveUserIdFromQuery } from '@/lib/customerContext';
import { checkFeatureAccess } from '@/lib/subscription';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ((req.method === 'PUT' || req.method === 'PATCH') && !checkCsrf(req, res)) return;
  const token = await requireAuth(req, res);
  if (!token) return;
  const uid = await resolveUserIdFromQuery(token, req);
  await dbConnect();

  if (req.method === 'GET') {
    const user = await User.findById(uid).select('brandingLogo brandingPrimaryColor brandingCompanyName companyName').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({
      success: true,
      data: {
        logo: (user as any).brandingLogo || '',
        primaryColor: (user as any).brandingPrimaryColor || '#6366f1',
        companyName: (user as any).brandingCompanyName || (user as any).companyName || '',
      },
    });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const { allowed } = await checkFeatureAccess(uid!, 'custom-branding');
    if (!allowed) return res.status(403).json({ error: 'Custom branding requires Business plan', upgradeUrl: '/pricing' });

    const { logo, primaryColor, companyName } = req.body;
    const update: Record<string, any> = {};
    if (typeof logo === 'string') update.brandingLogo = logo;
    if (typeof primaryColor === 'string') update.brandingPrimaryColor = primaryColor;
    if (typeof companyName === 'string') update.brandingCompanyName = companyName;

    await User.findByIdAndUpdate(uid, update);

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
