import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  
  // Demo route is always allowed without auth
  if (pathname.startsWith('/demo')) {
    return NextResponse.next();
  }
  
  const isProtectedRoute = pathname.startsWith('/projects') || pathname.startsWith('/editor');

  // Redirect unauthenticated users from protected routes to home page
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  // Exclude static files and public assets from middleware
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$|.*\\.webp$).*)'],
};
