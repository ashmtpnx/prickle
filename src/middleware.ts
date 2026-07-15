import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('prickle_session')?.value;
  const { pathname } = request.nextUrl;

  // If trying to access main chat routes without valid session cookie, redirect to login
  if (pathname.startsWith('/chat') || pathname === '/') {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // If accessing root "/", redirect directly to "/chat"
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/chat', request.url));
    }
  }

  // If trying to access login page while already authenticated, redirect to chat
  if (pathname.startsWith('/login')) {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/chat', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/chat/:path*', '/login/:path*'],
};
