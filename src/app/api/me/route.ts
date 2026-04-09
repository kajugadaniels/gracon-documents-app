import { NextRequest, NextResponse } from 'next/server';

const AUTH_BASE =
    process.env.NEXT_PUBLIC_AUTH_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3000/api/v1';

async function fetchProfile(accessToken: string) {
    return fetch(`${AUTH_BASE}/users/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
    });
}

async function refreshSession(refreshToken: string) {
    const response = await fetch(`${AUTH_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
    });

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    const payload = data?.data ?? data;

    if (!payload?.accessToken || !payload?.refreshToken) {
        return null;
    }

    return {
        accessToken: payload.accessToken as string,
        refreshToken: payload.refreshToken as string,
    };
}

function clearSessionCookies(response: NextResponse) {
    response.cookies.set('g360_at', '', { maxAge: 0, path: '/', sameSite: 'lax' });
    response.cookies.set('g360_rt', '', { maxAge: 0, path: '/', sameSite: 'lax' });
    return response;
}

function applySessionCookies(
    response: NextResponse,
    accessToken: string,
    refreshToken: string,
) {
    const maxAge = 60 * 60 * 24 * 30;

    response.cookies.set('g360_at', accessToken, {
        maxAge,
        path: '/',
        sameSite: 'lax',
    });
    response.cookies.set('g360_rt', refreshToken, {
        maxAge,
        path: '/',
        sameSite: 'lax',
    });

    return response;
}

export async function GET(request: NextRequest) {
    let accessToken = request.cookies.get('g360_at')?.value ?? null;
    const refreshToken = request.cookies.get('g360_rt')?.value ?? null;
    let refreshedTokens:
        | {
              accessToken: string;
              refreshToken: string;
          }
        | null = null;

    try {
        if (!accessToken && refreshToken) {
            const refreshed = await refreshSession(refreshToken);
            if (refreshed) {
                accessToken = refreshed.accessToken;
                refreshedTokens = refreshed;
            }
        }

        if (!accessToken) {
            return clearSessionCookies(
                NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
            );
        }

        let profileResponse = await fetchProfile(accessToken);

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
            applySessionCookies(
                response,
                refreshedTokens.accessToken,
                refreshedTokens.refreshToken,
            );
        }

        return response;
    } catch {
        return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 });
    }
}
