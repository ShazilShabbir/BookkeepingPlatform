const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(opts: { interval: number; max: number }) {
  return (key: string): { allowed: boolean; remaining: number; resetIn: number } => {
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + opts.interval });
      return { allowed: true, remaining: opts.max - 1, resetIn: opts.interval };
    }
    if (entry.count >= opts.max) {
      return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
    }
    entry.count++;
    return { allowed: true, remaining: opts.max - entry.count, resetIn: entry.resetAt - now };
  };
}

const LOGIN_LIMITER = rateLimit({ interval: 15 * 60 * 1000, max: 10 });
const SIGNUP_LIMITER = rateLimit({ interval: 60 * 60 * 1000, max: 3 });

export function checkLoginRateLimit(ip: string) {
  return LOGIN_LIMITER(`login:${ip}`);
}

export function checkSignupRateLimit(ip: string) {
  return SIGNUP_LIMITER(`signup:${ip}`);
}
