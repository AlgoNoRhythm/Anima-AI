import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for the Auth.js v5 session cookie (production uses __Secure- prefix)
  const sessionCookie =
    request.cookies.get('__Secure-authjs.session-token') ??
    request.cookies.get('authjs.session-token') ??
    request.cookies.get('next-auth.session-token') ??
    request.cookies.get('__Secure-next-auth.session-token');

  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/projects/:path*', '/settings/:path*'],
};
