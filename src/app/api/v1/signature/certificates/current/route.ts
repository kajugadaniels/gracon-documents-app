/**
 * Same-origin proxy for the signature service current-certificate endpoint.
 *
 * The browser must not call api/signature directly from app/documents because
 * deployment origins differ. This route forwards the shared session token,
 * refreshes it when needed, and preserves the upstream certificate status.
 */
import { NextRequest, NextResponse } from 'next/server';

const AUTH_BASE =
    process.env.NEXT_PUBLIC_AUTH_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3000/api/v1';

const SIGNATURE_BASE =
    process.env.NEXT_PUBLIC_SIGNATURE_API_URL ??
    'http://localhost:3002/api/v1';

type RefreshedTokens = {
    accessToken: string;
    refreshToken: string;
};

async function refreshSession(refreshToken: string): Promise<RefreshedTokens | null> {
    const response = await fetch(`${AUTH_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    const payload = data?.data ?? data;

    if (!payload?.accessToken || !payload?.refreshToken) return null;

    return {
        accessToken: payload.accessToken as string,
        refreshToken: payload.refreshToken as string,
    };
}

async function fetchCurrentCertificate(accessToken: string) {
    return fetch(`${SIGNATURE_BASE}/signature/certificates/current`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
    });
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
    let refreshedTokens: RefreshedTokens | null = null;

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
                NextResponse.json({ message: 'Not authenticated' }, { status: 401 }),
            );
        }

        let certificateResponse = await fetchCurrentCertificate(accessToken);

        if (certificateResponse.status === 401 && refreshToken) {
            const refreshed = await refreshSession(refreshToken);
            if (refreshed) {
                accessToken = refreshed.accessToken;
                refreshedTokens = refreshed;
                certificateResponse = await fetchCurrentCertificate(accessToken);
            }
        }

        const response = new NextResponse(await certificateResponse.text(), {
            status: certificateResponse.status,
            headers: {
                'Content-Type':
                    certificateResponse.headers.get('content-type') ?? 'application/json',
            },
        });

        if (certificateResponse.status === 401) {
            clearSessionCookies(response);
        } else if (refreshedTokens) {
            applySessionCookies(
                response,
                refreshedTokens.accessToken,
                refreshedTokens.refreshToken,
            );
        }

        return response;
    } catch {
        return NextResponse.json(
            { message: 'Unable to reach signature service.' },
            { status: 502 },
        );
    }
}
