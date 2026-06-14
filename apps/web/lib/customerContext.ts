import { getToken } from 'next-auth/jwt';
import type { NextApiRequest } from 'next';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';

export async function resolveUserId(token: any, requestedUserId?: string): Promise<string> {
  const adminId = token.sub!;
  if (!requestedUserId || requestedUserId === adminId) return adminId;
  await dbConnect();
  const customer = await User.findById(requestedUserId).select('createdBy').lean();
  if (customer && (customer as any).createdBy === adminId) return requestedUserId;
  console.warn(`resolveUserId: ${adminId} tried to access ${requestedUserId} — not authorized, falling back`);
  return adminId;
}

export async function resolveUserIdFromQuery(token: any, req: NextApiRequest): Promise<string> {
  return resolveUserId(token, req.query.userId as string | undefined);
}
