/**
 * Shared server-side session proxy helpers for app/documents.
 *
 * Next.js route handlers use this file when forwarding authenticated requests
 * to auth/signature services. The single-flight refresh map is intentionally
 * process-local and keyed by a hash so parallel proxy requests do not rotate
 * the same refresh token more than once.
 */
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const AUTH_BASE =
    process.env.NEXT_PUBLIC_AUTH_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3000/api/v1';
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type RefreshedTokens = {
    accessToken: string;
    refreshToken: string;
    tokenType: 'full' | 'limited';
};

type RefreshMode = 'refresh' | 'upgrade';

const pendingRefreshes = new Map<string, Promise<RefreshedTokens | null>>();

function hashRefreshToken(refreshToken: string) {
    return crypto.createHash('sha256').update(refreshToken).digest('hex');
}

function getRefreshPath(mode: RefreshMode) {
    return mode === 'upgrade' ? '/auth/session/upgrade' : '/auth/refresh';
}

/**
 * Reads shared auth cookies from a Next.js route request.
 */
export function getSessionCookies(request: NextRequest) {
    return {
        accessToken: request.cookies.get('g360_at')?.value ?? null,
        refreshToken: request.cookies.get('g360_rt')?.value ?? null,
    };
}

/**
 * Rotates or upgrades the current refresh token with single-flight protection.
 */
export function refreshSession(
    refreshToken: string,
    mode: RefreshMode = 'refresh',
): Promise<RefreshedTokens | null> {
    const key = `${mode}:${hashRefreshToken(refreshToken)}`;
    const pending = pendingRefreshes.get(key);
    if (pending) return pending;

    const refresh = fetch(`${AUTH_BASE}${getRefreshPath(mode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
    })
        .then(async (response) => {
            if (!response.ok) return null;

            const data = await response.json();
            const payload = data?.data ?? data;

            if (!payload?.accessToken || !payload?.refreshToken) return null;

            const tokenType: RefreshedTokens['tokenType'] =
                payload.tokenType === 'limited' ? 'limited' : 'full';

            return {
                accessToken: payload.accessToken as string,
                refreshToken: payload.refreshToken as string,
                tokenType,
            };
        })
        .finally(() => {
            pendingRefreshes.delete(key);
        });

    pendingRefreshes.set(key, refresh);
    return refresh;
}

/**
 * Clears shared auth cookies after the auth service confirms the session is no
 * longer recoverable.
 */
export function clearSessionCookies<T extends NextResponse>(response: T): T {
    response.cookies.set('g360_at', '', { maxAge: 0, path: '/', sameSite: 'lax' });
    response.cookies.set('g360_rt', '', { maxAge: 0, path: '/', sameSite: 'lax' });
    return response;
}

/**
 * Applies a rotated auth session to the shared cookie names used by Gracon apps.
 */
export function applySessionCookies<T extends NextResponse>(
    response: T,
    tokens: RefreshedTokens,
): T {
    response.cookies.set('g360_at', tokens.accessToken, {
        maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
        path: '/',
        sameSite: 'lax',
    });
    response.cookies.set('g360_rt', tokens.refreshToken, {
        maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
        path: '/',
        sameSite: 'lax',
    });

    return response;
}

/**
 * Ensures a route handler has an access token, refreshing from cookies when the
 * browser only still has a valid refresh token.
 */
export async function resolveAccessToken(
    request: NextRequest,
    mode: RefreshMode = 'refresh',
): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    refreshedTokens: RefreshedTokens | null;
}> {
    const { accessToken, refreshToken } = getSessionCookies(request);

    if (accessToken || !refreshToken) {
        return { accessToken, refreshToken, refreshedTokens: null };
    }

    const refreshedTokens = await refreshSession(refreshToken, mode);

    return {
        accessToken: refreshedTokens?.accessToken ?? null,
        refreshToken,
        refreshedTokens,
    };
}

/**
 * Copies an upstream response body/status and writes any rotated cookies.
 */
export async function forwardResponseWithSession(
    upstreamResponse: Response,
    refreshedTokens: RefreshedTokens | null,
): Promise<NextResponse> {
    const response = new NextResponse(await upstreamResponse.text(), {
        status: upstreamResponse.status,
        headers: {
            'Content-Type':
                upstreamResponse.headers.get('content-type') ?? 'application/json',
        },
    });

    if (upstreamResponse.status === 401) {
        clearSessionCookies(response);
    } else if (refreshedTokens) {
        applySessionCookies(response, refreshedTokens);
    }

    return response;
}
