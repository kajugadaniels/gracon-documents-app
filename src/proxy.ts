import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
    documentAuthCookiePolicy,
    shouldUseMainAppLogin,
} from '@/lib/auth/session-cookie-policy';

const APP_URL =
    process.env.NEXT_PUBLIC_MAIN_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:4000';

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
        req.cookies.has(documentAuthCookiePolicy.sessionHintCookieName) ||
        req.cookies.has(documentAuthCookiePolicy.accessCookieName) ||
        req.cookies.has(documentAuthCookiePolicy.refreshCookieName);

    if (pathname === '/login' && hasSessionCookie) {
        return NextResponse.redirect(new URL('/documents', req.url));
    }

    if (isPublic) return NextResponse.next();

    if (!hasSessionCookie) {
        const loginBase = shouldUseMainAppLogin() ? APP_URL : req.url;
        const loginUrl = new URL('/login', loginBase);
        const next = shouldUseMainAppLogin()
            ? new URL(`${pathname}${search}`, req.url).toString()
            : `${pathname}${search}`;

        loginUrl.searchParams.set('next', next);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)'],
};
