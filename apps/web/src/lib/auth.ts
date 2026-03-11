import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { createDatabase, userQueries } from '@anima-ai/database';

// Fail fast: reject insecure AUTH_SECRET in production
if (
  process.env.NODE_ENV === 'production' &&
  process.env.AUTH_SECRET === 'change-me-in-production'
) {
  throw new Error(
    'AUTH_SECRET is set to the default "change-me-in-production" value. ' +
    'You must set a secure AUTH_SECRET in production.',
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[auth] authorize called');
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) {
          console.log('[auth] missing email or password');
          return null;
        }

        console.log('[auth] connecting to db');
        const db = createDatabase();
        const users = userQueries(db);
        console.log('[auth] querying user');
        const user = await users.findByEmail(email);
        if (!user) {
          console.log('[auth] user not found');
          return null;
        }

        console.log('[auth] comparing password');
        const valid = await bcrypt.compare(password, user.passwordHash);
        console.log('[auth] bcrypt result:', valid);
        if (!valid) return null;

        console.log('[auth] login success');
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
