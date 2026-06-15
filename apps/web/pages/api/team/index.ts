import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongoose';
import TeamMember from '@/lib/models/TeamMember';
import User from '@/lib/models/User';
import { requireAuth, requireRole, checkCsrf } from '@/lib/auth';
import { hasFeature, getTier } from '@/lib/tiers';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkCsrf(req, res)) return;

  const token = await requireAuth(req, res);
  if (!token) return;
  const uid = token.sub!;

  await dbConnect();

  if (req.method === 'GET') {
    const members = await TeamMember.find({ adminId: uid }).sort({ invitedAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      data: members.map(m => ({
        id: (m as any)._id.toString(),
        email: (m as any).email,
        name: (m as any).name,
        role: (m as any).role,
        status: (m as any).status,
        invitedAt: (m as any).invitedAt?.toISOString(),
        joinedAt: (m as any).joinedAt?.toISOString(),
      })),
    });
  }

  if (req.method === 'POST') {
    const action = req.body.action || req.query.action;

    if (action === 'accept') {
      const { token: inviteToken } = req.body;
      if (!inviteToken) return res.status(400).json({ error: 'Token required' });

      const invite = await TeamMember.findOne({ inviteToken, status: 'invited' });
      if (!invite) return res.status(404).json({ error: 'Invalid or expired invitation' });

      const user = await User.findById(uid);
      if (!user) return res.status(404).json({ error: 'User not found' });

      (invite as any).memberId = uid;
      (invite as any).status = 'active';
      (invite as any).joinedAt = new Date();
      (invite as any).name = user.name;
      await (invite as any).save();

      return res.status(200).json({ success: true });
    }

    if (action === 'invite') {
      if (!requireRole(token, 'admin')) {
        return res.status(403).json({ error: 'Only admins can invite team members' });
      }

      const user = await User.findById(uid).lean();
      const tier = getTier(((user as any)?.subscriptionTier || 'free') as any);
      if (!hasFeature(tier as any, 'multi-user' as any)) {
        return res.status(403).json({ error: 'Multi-user access requires Business plan. Visit /pricing to upgrade.', code: 'UPGRADE_REQUIRED' });
      }

      const { email, role } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });

      const activeCount = await TeamMember.countDocuments({ adminId: uid, status: 'active' });
      if (activeCount >= tier.maxUsers) {
        return res.status(403).json({ error: `Maximum of ${tier.maxUsers} team members reached.` });
      }

      const existing = await TeamMember.findOne({ adminId: uid, email: email.toLowerCase() });
      if (existing) return res.status(409).json({ error: 'Already invited' });

      const inviteToken = crypto.randomBytes(32).toString('hex');
      const member = await TeamMember.create({
        adminId: uid,
        email: email.toLowerCase(),
        role: role || 'viewer',
        inviteToken,
      });

      const adminUser = await User.findById(uid).lean();
      const adminName = (adminUser as any)?.name || 'Your admin';
      const acceptUrl = `${process.env.NEXTAUTH_URL}/accept-invite?token=${inviteToken}`;

      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await (resend.emails.send as any)({
          from: 'BookKeep <onboarding@resend.dev>',
          to: email,
          subject: `${adminName} invited you to join BookKeep`,
          html: `<p>${adminName} has invited you to join their BookKeep team as a <strong>${role || 'viewer'}</strong>.</p>
<p><a href="${acceptUrl}">Click here to accept the invitation</a></p>
<p>If you don't have an account yet, you'll be able to create one.</p>`,
        });
      } catch (e) {
        console.error('Failed to send invite email:', e);
      }

      return res.status(201).json({
        success: true,
        data: { id: (member as any)._id.toString(), email, role: role || 'viewer', status: 'invited' },
      });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  if (req.method === 'DELETE') {
    if (!requireRole(token, 'admin')) {
      return res.status(403).json({ error: 'Only admins can remove team members' });
    }

    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ error: 'memberId required' });

    const member = await TeamMember.findOne({ _id: memberId, adminId: uid });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    await TeamMember.deleteOne({ _id: memberId, adminId: uid });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
