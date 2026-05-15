import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies, getSessionCookies } from '@/lib/server/session-proxy';

const AUTH_BASE =
    process.env.NEXT_PUBLIC_AUTH_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3000/api/v1';

export async function POST(request: NextRequest) {
    const { refreshToken } = getSessionCookies(request);

    if (refreshToken) {
        try {
            await fetch(`${AUTH_BASE}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
                cache: 'no-store',
            });
        } catch {
            // Local logout must still clear browser cookies even if the auth
            // service is temporarily unavailable or already revoked the token.
        }
    }

    return clearSessionCookies(NextResponse.json({ success: true }));
}
