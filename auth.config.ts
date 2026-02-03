import NextAuth from 'next-auth';

// Edge-compatible auth config (no Prisma, no bcrypt)
// Used only for middleware session checks
export const authConfig = {
  providers: [], // Providers are only needed in the full auth config
  pages: {
    signIn: '/', // Redirect to Home if authentication fails
  },
  callbacks: {
    // Authorized callback removed to let middleware handle redirects manually
    async session({ session, token }: { session: any; token: any }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  session: {
    strategy: 'jwt' as const
  }
};

export const { auth: authMiddleware } = NextAuth(authConfig);
