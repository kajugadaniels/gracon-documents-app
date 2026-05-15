import { NextRequest, NextResponse } from 'next/server';
import {
    applySessionCookies,
    clearSessionCookies,
    getSessionCookies,
    refreshSession,
} from '@/lib/server/session-proxy';

export async function POST(request: NextRequest) {
    const { refreshToken } = getSessionCookies(request);

    if (!refreshToken) {
        const response = NextResponse.json(
            { error: 'No refresh token' },
            { status: 401 },
        );
        return clearSessionCookies(response);
    }

    try {
        const tokens = await refreshSession(refreshToken);

        if (!tokens) {
            const response = NextResponse.json(
                { error: 'Refresh failed' },
                { status: 401 },
            );
            return clearSessionCookies(response);
        }

        return applySessionCookies(
            NextResponse.json({
                accessToken: tokens.accessToken,
                tokenType: tokens.tokenType,
            }),
            tokens,
        );
    } catch {
        return NextResponse.json(
            { error: 'Auth service unavailable' },
            { status: 503 },
        );
    }
}
