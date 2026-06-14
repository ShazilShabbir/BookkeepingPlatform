import { NextApiRequest, NextApiResponse } from 'next';
import { getToken, JWT } from 'next-auth/jwt';

const ALLOWED_ORIGINS = [
  process.env.NEXTAUTH_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[];

export async function requireAuth(req: NextApiRequest, res: NextApiResponse): Promise<JWT | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return token;
}

export function requireRole(token: JWT, ...roles: string[]): boolean {
  const userRole = (token as any).role || 'admin';
  return roles.includes(userRole);
}

export function checkCsrf(req: NextApiRequest, res: NextApiResponse): boolean {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return true;
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (origin) {
    if (!ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o + '/'))) {
      res.status(403).json({ error: 'CSRF validation failed' });
      return false;
    }
    return true;
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      if (!ALLOWED_ORIGINS.some(o => refererOrigin === o)) {
        res.status(403).json({ error: 'CSRF validation failed' });
        return false;
      }
      return true;
    } catch {
      res.status(403).json({ error: 'CSRF validation failed' });
      return false;
    }
  }

  res.status(403).json({ error: 'CSRF validation failed' });
  return false;
}
