import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const cookieNames = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'authjs.session-token',
  '__Secure-authjs.session-token',
];

export function middleware(request: NextRequest) {
  // Check for session token in cookies
  const hasSession = cookieNames.some((name) => request.cookies.has(name));
  const isLoggedIn = hasSession;
  const { pathname } = request.nextUrl;
  
  // Demo route is always allowed without auth
  if (pathname.startsWith('/demo')) {
    return NextResponse.next();
  }
  
  const isProtectedRoute = pathname.startsWith('/projects') || pathname.startsWith('/editor');

  // Redirect unauthenticated users from protected routes to home page
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  // Exclude static files and public assets from middleware
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$|.*\\.webp$).*)'],
};
