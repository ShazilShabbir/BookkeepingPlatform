import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { checkLoginRateLimit } from '@/lib/rateLimit';
import { verifyTOTP } from '@/lib/totp';
import * as crypto from 'crypto';

interface UserWithRole {
  id: string;
  email: string;
  name: string;
  role: string;
}

const PREAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me';

function verifyPreAuthToken(token: string): { sub: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const sig = crypto.createHmac('sha256', PREAUTH_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (sig !== parts[2]) return null;
    const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (Date.now() > body.exp) return null;
    return { sub: body.sub, email: body.email };
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        preAuthToken: { label: 'Pre-Auth Token', type: 'text' },
        totpToken: { label: 'TOTP Code', type: 'text' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const ip = (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            || req?.headers?.['x-real-ip'] as string
            || 'unknown';
          const { allowed } = checkLoginRateLimit(ip);
          if (!allowed) return null;

          await dbConnect();

          if (credentials.preAuthToken) {
            const preAuth = verifyPreAuthToken(credentials.preAuthToken);
            if (!preAuth) return null;

            const user = await User.findById(preAuth.sub).lean();
            if (!user) return null;
            const u = user as any;

            if (!u.totpEnabled) return null;

            if (!credentials.totpToken || !verifyTOTP(credentials.totpToken, u.totpSecret)) {
              if (u.totpBackupCodes && credentials.totpToken) {
                const idx = u.totpBackupCodes.indexOf(credentials.totpToken);
                if (idx >= 0) {
                  u.totpBackupCodes.splice(idx, 1);
                  await User.findByIdAndUpdate(preAuth.sub, { totpBackupCodes: u.totpBackupCodes });
                } else {
                  return null;
                }
              } else {
                return null;
              }
            }

            return {
              id: u._id.toString(),
              email: u.email,
              name: u.name,
              role: u.role || 'admin',
            };
          }

          const user = await User.findOne({ email: credentials.email.toLowerCase() }).lean();
          if (!user) return null;
          const u = user as any;
          const valid = await bcrypt.compare(credentials.password, u.password);
          if (!valid) return null;

          if (u.totpEnabled) {
            return null;
          }

          const userWithRole: UserWithRole = {
            id: u._id.toString(),
            email: u.email,
            name: u.name,
            role: u.role || 'admin',
          };
          return userWithRole;
        } catch (error) {
          console.error('Auth authorize error:', error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as UserWithRole).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = (token.role as string) || 'admin';
      }
      return session;
    },
  },
  pages: { signIn: '/login', newUser: '/signup' },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
