import { NextRequest, NextResponse } from 'next/server';

const AUTH_BASE =
    process.env.NEXT_PUBLIC_AUTH_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3000/api/v1';

export async function POST(request: NextRequest) {
    const refreshToken = request.cookies.get('g360_rt')?.value ?? null;

    if (!refreshToken) {
        const response = NextResponse.json(
            { error: 'No refresh token' },
            { status: 401 },
        );
        response.cookies.set('g360_at', '', { maxAge: 0, path: '/', sameSite: 'lax' });
        response.cookies.set('g360_rt', '', { maxAge: 0, path: '/', sameSite: 'lax' });
        return response;
    }

    try {
        const authResponse = await fetch(`${AUTH_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
            cache: 'no-store',
        });

        if (!authResponse.ok) {
            const response = NextResponse.json(
                { error: 'Refresh failed' },
                { status: 401 },
            );
            response.cookies.set('g360_at', '', { maxAge: 0, path: '/', sameSite: 'lax' });
            response.cookies.set('g360_rt', '', { maxAge: 0, path: '/', sameSite: 'lax' });
            return response;
        }

        const data = await authResponse.json();
        const payload = data?.data ?? data;
        const accessToken = payload?.accessToken as string | undefined;
        const newRefreshToken = payload?.refreshToken as string | undefined;

        if (!accessToken || !newRefreshToken) {
            const response = NextResponse.json(
                { error: 'Refresh payload incomplete' },
                { status: 502 },
            );
            response.cookies.set('g360_at', '', { maxAge: 0, path: '/', sameSite: 'lax' });
            response.cookies.set('g360_rt', '', { maxAge: 0, path: '/', sameSite: 'lax' });
            return response;
        }

        const response = NextResponse.json({ accessToken });
        const maxAge = 60 * 60 * 24 * 30;

        response.cookies.set('g360_at', accessToken, {
            maxAge,
            path: '/',
            sameSite: 'lax',
        });
        response.cookies.set('g360_rt', newRefreshToken, {
            maxAge,
            path: '/',
            sameSite: 'lax',
        });

        return response;
    } catch {
        return NextResponse.json(
            { error: 'Auth service unavailable' },
            { status: 503 },
        );
    }
}
