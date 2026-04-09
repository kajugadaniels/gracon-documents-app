import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC = ['/login', '/verify'];
const COOKIE = 'doc_session';

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const hasSession = req.cookies.has(COOKIE);
    const isPublic = PUBLIC.some((r) => pathname === r || pathname.startsWith(`${r}/`));

    if (isPublic && hasSession) return NextResponse.redirect(new URL('/documents', req.url));
    if (!isPublic && !hasSession) {
        const url = new URL('/login', req.url);
        url.searchParams.set('next', pathname);
        return NextResponse.redirect(url);
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',],
};