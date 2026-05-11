import { NextRequest, NextResponse } from 'next/server';
import {
    applySessionCookies,
    clearSessionCookies,
    refreshSession,
    resolveAccessToken,
} from '@/lib/server/session-proxy';

async function fetchProfile(accessToken: string) {
    const AUTH_BASE =
        process.env.NEXT_PUBLIC_AUTH_API_URL ??
        process.env.NEXT_PUBLIC_API_URL ??
        'http://localhost:3000/api/v1';

    return fetch(`${AUTH_BASE}/users/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
    });
}

export async function GET(request: NextRequest) {
    try {
        let { accessToken, refreshToken, refreshedTokens } =
            await resolveAccessToken(request);

        if (!accessToken) {
            return clearSessionCookies(
                NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
            );
        }

        let profileResponse = await fetchProfile(accessToken);

        if (profileResponse.status === 403 && refreshToken) {
            const upgradedTokens = await refreshSession(refreshToken, 'upgrade');
            if (upgradedTokens) {
                accessToken = upgradedTokens.accessToken;
                refreshedTokens = upgradedTokens;
                profileResponse = await fetchProfile(accessToken);
            }
        }

        if (!profileResponse.ok && refreshToken) {
            const refreshed = await refreshSession(refreshToken);
            if (refreshed) {
                accessToken = refreshed.accessToken;
                refreshedTokens = refreshed;
                profileResponse = await fetchProfile(accessToken);
            }
        }

        if (!profileResponse.ok) {
            return clearSessionCookies(
                NextResponse.json({ error: 'Session expired' }, { status: 401 }),
            );
        }

        const data = await profileResponse.json();
        const response = NextResponse.json(data);

        if (refreshedTokens) {
            applySessionCookies(response, refreshedTokens);
        }

        return response;
    } catch {
        return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 });
    }
}
