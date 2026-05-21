/**
 * Proxies user preference reads from the documents app to api/auth.
 *
 * The browser keeps talking to the documents origin while the route handler
 * forwards the authenticated request to the user-owned preferences endpoint.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
    clearSessionCookies,
    forwardResponseWithSession,
    resolveAccessToken,
} from '@/lib/server/session-proxy';

const AUTH_SERVICE_BASE =
    process.env.NEXT_PUBLIC_AUTH_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3000/api/v1';

/**
 * Reads the current user's cross-platform invitation defaults.
 */
export async function GET(request: NextRequest) {
    try {
        const { accessToken, refreshedTokens } = await resolveAccessToken(request);

        if (!accessToken) {
            return clearSessionCookies(
                NextResponse.json({ message: 'Authentication required.' }, { status: 401 }),
            );
        }

        const response = await fetch(`${AUTH_SERVICE_BASE}/users/preferences`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        return forwardResponseWithSession(response, refreshedTokens);
    } catch {
        return NextResponse.json(
            { message: 'Unable to reach auth service.' },
            { status: 502 },
        );
    }
}
