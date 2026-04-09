import { NextResponse } from 'next/server';

const AUTH_SERVICE_BASE =
    process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'http://localhost:3000/api/v1';

export async function POST(request: Request) {
    try {
        const body = await request.text();
        const response = await fetch(`${AUTH_SERVICE_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body,
            cache: 'no-store',
        });

        const responseText = await response.text();
        const nextResponse = new NextResponse(responseText, {
            status: response.status,
            headers: {
                'Content-Type':
                    response.headers.get('content-type') ?? 'application/json',
            },
        });

        if (response.ok) {
            try {
                const data = JSON.parse(responseText);
                const payload = data?.data ?? data;
                const accessToken = payload?.accessToken as string | undefined;
                const refreshToken = payload?.refreshToken as string | undefined;

                if (accessToken && refreshToken) {
                    const maxAge = 60 * 60 * 24 * 30;

                    nextResponse.cookies.set('g360_at', accessToken, {
                        maxAge,
                        path: '/',
                        sameSite: 'lax',
                    });
                    nextResponse.cookies.set('g360_rt', refreshToken, {
                        maxAge,
                        path: '/',
                        sameSite: 'lax',
                    });
                }
            } catch {
                // Ignore malformed non-JSON auth responses and pass the body through.
            }
        }

        return nextResponse;
    } catch {
        return Response.json(
            {
                message: 'Unable to reach authentication service.',
            },
            { status: 502 },
        );
    }
}
