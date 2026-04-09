import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// The shared cookie written by app/app on login
const SHARED_TOKEN_COOKIE = 'g360_at';

// The URL of app/app — unauthenticated users are redirected here
const APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL ?? 'http://localhost:4000';
const DOCS_URL =
    process.env.NEXT_PUBLIC_DOCS_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:4002';

// Public routes in app/documents that do not require authentication
const PUBLIC_PATHS = ['/verify'];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Never intercept Next.js internals
    if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
        return NextResponse.next();
    }

    // Allow app-internal API routes to proxy auth/session requests.
    if (pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    const hasToken = req.cookies.has(SHARED_TOKEN_COOKIE);

    // Public route — always allow
    if (isPublic) return NextResponse.next();

    // No token — redirect to app/app login with ?next pointing back here
    if (!hasToken) {
        const next = `${DOCS_URL}${pathname}`;
        const loginUrl = `${APP_URL}/login?next=${encodeURIComponent(next)}`;
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',],
};
