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
        console.log('[auth] authorize START');
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) {
          console.log('[auth] missing credentials');
          return null;
        }

        console.log('[auth] db lookup');
        const db = createDatabase();
        const users = userQueries(db);
        const user = await users.findByEmail(email);
        console.log('[auth] user found:', !!user);
        if (!user) return null;

        console.log('[auth] bcrypt compare starting');
        const valid = await bcrypt.compare(password, user.passwordHash);
        console.log('[auth] bcrypt done:', valid);
        if (!valid) return null;

        console.log('[auth] authorize SUCCESS');
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
