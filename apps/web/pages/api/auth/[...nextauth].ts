import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/lib/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await dbConnect();
        const user = await User.findOne({ email: credentials.email.toLowerCase() }).lean();
        if (!user) return null;
        const u = user as any;
        const valid = await bcrypt.compare(credentials.password, u.password);
        if (!valid) return null;
        return { id: u._id.toString(), email: u.email, name: u.name };
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) { (session.user as any).id = token.id as string; }
      return session;
    },
  },
  pages: { signIn: '/login', newUser: '/signup' },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
