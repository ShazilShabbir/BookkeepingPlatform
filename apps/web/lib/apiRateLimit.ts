import { NextApiRequest, NextApiResponse } from 'next';

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW = 60 * 1000;
const MAX_PER_WINDOW = 60;

export function getClientIp(req: NextApiRequest): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.headers['x-real-ip'] as string
    || req.socket?.remoteAddress
    || 'unknown';
}

export function checkApiRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW });
    return { allowed: true, remaining: MAX_PER_WINDOW - 1, resetIn: WINDOW };
  }
  if (entry.count >= MAX_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  entry.count++;
  return { allowed: true, remaining: MAX_PER_WINDOW - entry.count, resetIn: entry.resetAt - now };
}

export function withRateLimit(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'OPTIONS') return handler(req, res);

    const ip = getClientIp(req);
    const { allowed, remaining, resetIn } = checkApiRateLimit(ip);

    res.setHeader('X-RateLimit-Limit', String(MAX_PER_WINDOW));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Date.now() + resetIn));

    if (!allowed) {
      res.setHeader('Retry-After', String(Math.ceil(resetIn / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    return handler(req, res);
  };
}
