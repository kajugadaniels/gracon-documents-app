import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// The shared cookies written by app/app on login.
const ACCESS_TOKEN_COOKIE = 'g360_at';
const REFRESH_TOKEN_COOKIE = 'g360_rt';

// Public routes in app/documents that do not require authentication.
const PUBLIC_PATHS = ['/verify', '/login'];

export function proxy(req: NextRequest) {
    const { pathname, search } = req.nextUrl;

    // Never intercept Next.js internals.
    if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
        return NextResponse.next();
    }

    // Allow app-internal API routes to proxy auth/session requests.
    if (pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    const hasSessionCookie =
        req.cookies.has(ACCESS_TOKEN_COOKIE) || req.cookies.has(REFRESH_TOKEN_COOKIE);

    if (pathname === '/login' && hasSessionCookie) {
        return NextResponse.redirect(new URL('/documents', req.url));
    }

    if (isPublic) return NextResponse.next();

    if (!hasSessionCookie) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('next', `${pathname}${search}`);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)'],
};
