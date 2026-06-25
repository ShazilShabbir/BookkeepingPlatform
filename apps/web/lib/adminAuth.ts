import { NextApiRequest, NextApiResponse } from 'next';
import * as crypto from 'crypto';

const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-admin-secret-change-me';
const ADMIN_JWT_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours

export interface AdminPayload {
  role: 'superadmin';
  type: 'admin-session';
  iat: number;
  exp: number;
}

export function signAdminToken(payload: Omit<AdminPayload, 'iat' | 'exp'>): string {
  const iat = Date.now();
  const exp = iat + ADMIN_JWT_MAX_AGE;
  const body = { ...payload, iat, exp };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const bodyEncoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(`${header}.${bodyEncoded}`).digest('base64url');
  return `${header}.${bodyEncoded}.${sig}`;
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (sig !== parts[2]) return null;
    const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as AdminPayload;
    if (Date.now() > body.exp) return null;
    if (body.role !== 'superadmin') return null;
    return body;
  } catch {
    return null;
  }
}

export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AdminPayload | null> {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/admin_token=([^;]+)/);
  if (!match) {
    res.status(401).json({ error: 'Admin authentication required' });
    return null;
  }
  const payload = verifyAdminToken(match[1]);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired admin session' });
    return null;
  }
  return payload;
}
