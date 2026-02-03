import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import prisma from './lib/prisma';
import bcrypt from 'bcryptjs';
import { LoginSchema } from './lib/definitions';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        console.log('Authorizing credentials:', credentials);
        const parsedCredentials = LoginSchema.safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
             console.log('User not found');
             return null;
          }
          
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) {
             console.log('Password matched');
             return user;
          }
          console.log('Password mismatch');
        } else {
            console.log('Zod validation failed');
        }

        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token }) {
       if (token?.sub && session.user) {
         session.user.id = token.sub; // Ensure ID is available
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
    strategy: 'jwt'
  }
});
