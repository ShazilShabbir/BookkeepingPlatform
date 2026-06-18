import * as crypto from 'crypto';

function base32Encode(buf: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  const pad = 8 - (output.length % 8);
  if (pad !== 8) output += '='.repeat(pad);
  return output;
}

function base32Decode(s: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = s.replace(/[^A-Z2-7]/gi, '').toUpperCase();
  const bits: number[] = [];
  for (const ch of cleaned) {
    const val = alphabet.indexOf(ch);
    if (val >= 0) {
      bits.push(...[4, 3, 2, 1, 0].map(b => (val >> b) & 1));
    }
  }
  const bytes: number[] = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    bytes.push(byte);
  }
  return Buffer.from(bytes);
}

function totpHash(key: Buffer, counter: number): number {
  const counterBuf = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = counter & 0xff;
    counter >>>= 8;
  }
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return code % 1000000;
}

export function generateSecret(): string {
  const key = crypto.randomBytes(20);
  return base32Encode(key);
}

export function generateTOTP(secret: string, window = 0): string {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 30000) + window;
  return String(totpHash(key, counter)).padStart(6, '0');
}

export function verifyTOTP(token: string, secret: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  for (let window = -1; window <= 1; window++) {
    if (generateTOTP(secret, window) === token) return true;
  }
  return false;
}

export function generateOTPAuthURL(secret: string, email: string, issuer = 'BookKeep'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}
