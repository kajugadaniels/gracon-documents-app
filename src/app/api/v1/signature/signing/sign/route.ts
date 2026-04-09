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

async function signDocument(body: string, accessToken: string) {
    return fetch(`${SIGNATURE_BASE}/signature/signing/sign`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body,
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

export async function POST(request: NextRequest) {
    const body = await request.text();
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

        let signatureResponse = await signDocument(body, accessToken);

        if (signatureResponse.status === 401 && refreshToken) {
            const refreshed = await refreshSession(refreshToken);
            if (refreshed) {
                accessToken = refreshed.accessToken;
                refreshedTokens = refreshed;
                signatureResponse = await signDocument(body, accessToken);
            }
        }

        const responseBody = await signatureResponse.text();
        const response = new NextResponse(responseBody, {
            status: signatureResponse.status,
            headers: {
                'Content-Type':
                    signatureResponse.headers.get('content-type') ?? 'application/json',
            },
        });

        if (signatureResponse.status === 401) {
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
