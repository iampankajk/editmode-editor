import NextAuth from 'next-auth';

// Edge-compatible auth config (no Prisma, no bcrypt)
// Used only for middleware session checks
export const authConfig = {
  providers: [], // Providers are only needed in the full auth config
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      
      // Demo route is always allowed
      if (pathname.startsWith('/demo')) {
        return true;
      }
      
      const isProtectedRoute = pathname.startsWith('/projects') || pathname.startsWith('/editor');
      
      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect to signIn page
      }
      
      return true;
    },
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
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
