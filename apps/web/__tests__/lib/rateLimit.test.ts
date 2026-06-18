import { rateLimit, checkLoginRateLimit, checkSignupRateLimit } from '@/lib/rateLimit';

describe('rateLimit', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('allows requests within limit', () => {
    const limiter = rateLimit({ interval: 10000, max: 3 });
    const r1 = limiter('test-key');
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter('test-key');
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter('test-key');
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests exceeding limit', () => {
    const limiter = rateLimit({ interval: 10000, max: 2 });
    limiter('key');
    limiter('key');
    const r3 = limiter('key');
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('resets after interval', () => {
    const limiter = rateLimit({ interval: 100, max: 1 });
    limiter('key');
    const r2 = limiter('key');
    expect(r2.allowed).toBe(false);

    return new Promise<void>(resolve => {
      setTimeout(() => {
        const r3 = limiter('key');
        expect(r3.allowed).toBe(true);
        resolve();
      }, 150);
    });
  });

  it('tracks different keys independently', () => {
    const limiter = rateLimit({ interval: 10000, max: 1 });
    const r1 = limiter('key-a');
    expect(r1.allowed).toBe(true);

    const r2 = limiter('key-b');
    expect(r2.allowed).toBe(true);

    const r3 = limiter('key-a');
    expect(r3.allowed).toBe(false);

    const r4 = limiter('key-b');
    expect(r4.allowed).toBe(false);
  });
});

describe('checkLoginRateLimit', () => {
  it('returns allowed for first attempt', () => {
    const result = checkLoginRateLimit('1.2.3.4');
    expect(result.allowed).toBe(true);
  });

  it('returns remaining count', () => {
    const result = checkLoginRateLimit('5.6.7.8');
    expect(result.remaining).toBeGreaterThanOrEqual(0);
    expect(result.remaining).toBeLessThanOrEqual(9);
  });
});

describe('checkSignupRateLimit', () => {
  it('returns allowed for first attempt', () => {
    const result = checkSignupRateLimit('1.2.3.4');
    expect(result.allowed).toBe(true);
  });

  it('returns resetIn as a positive number', () => {
    const result = checkSignupRateLimit('9.9.9.9');
    expect(result.resetIn).toBeGreaterThan(0);
  });
});
