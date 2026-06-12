import dbConnect from '@/lib/mongoose';
import AuditLog from '@/lib/models/AuditLog';
import TrashItem from '@/lib/models/TrashItem';
import { NextApiRequest } from 'next';

export interface LogActionParams {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, any>;
  req?: NextApiRequest;
}

export async function logAction(params: LogActionParams) {
  await dbConnect();
  return AuditLog.create({
    userId: params.userId,
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId,
    details: params.details || {},
    ip: params.req?.headers?.['x-forwarded-for'] || params.req?.socket?.remoteAddress || null,
    userAgent: params.req?.headers?.['user-agent'] || null,
    createdAt: new Date(),
  });
}

export async function trashItem(params: {
  userId: string;
  resource: string;
  resourceId: string;
  label: string;
  snapshot: Record<string, any>;
}) {
  await dbConnect();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return TrashItem.create({
    userId: params.userId,
    resource: params.resource,
    resourceId: params.resourceId,
    label: params.label,
    snapshot: params.snapshot,
    expiresAt,
    createdAt: new Date(),
  });
}

export async function getAuditLogs(
  userId: string,
  options?: { resource?: string; action?: string; limit?: number; skip?: number },
) {
  await dbConnect();
  const filter: Record<string, any> = { userId };
  if (options?.resource) filter.resource = options.resource;
  if (options?.action) filter.action = options.action;

  return AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(options?.limit || 50)
    .skip(options?.skip || 0)
    .lean();
}
