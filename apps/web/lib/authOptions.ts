import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';
import { checkLoginRateLimit } from '@/lib/rateLimit';

interface UserWithRole {
  id: string;
  email: string;
  name: string;
  role: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
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
          const user = await User.findOne({ email: credentials.email.toLowerCase() }).lean();
          if (!user) return null;
          const u = user as any;
          const valid = await bcrypt.compare(credentials.password, u.password);
          if (!valid) return null;
          
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
