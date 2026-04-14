/**
 * Proxies multipart verification submissions from the documents app to the
 * auth service while preserving the uploaded files, caller token, and any
 * upgraded token pair returned after a successful verification.
 */

import { NextResponse } from 'next/server';

const AUTH_SERVICE_BASE =
    process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'http://localhost:3000/api/v1';

export async function POST(request: Request) {
    try {
        const incomingForm = await request.formData();
        const upstreamForm = new FormData();

        for (const [key, value] of incomingForm.entries()) {
            upstreamForm.append(key, value);
        }

        const response = await fetch(`${AUTH_SERVICE_BASE}/verification/submit`, {
            method: 'POST',
            headers: {
                Authorization: request.headers.get('Authorization') ?? '',
            },
            body: upstreamForm,
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
                const upgradedTokens = payload?.upgradedTokens as
                    | { accessToken?: string; refreshToken?: string }
                    | undefined;

                if (
                    upgradedTokens?.accessToken &&
                    upgradedTokens?.refreshToken
                ) {
                    const maxAge = 60 * 60 * 24 * 30;

                    nextResponse.cookies.set(
                        'g360_at',
                        upgradedTokens.accessToken,
                        { maxAge, path: '/', sameSite: 'lax' },
                    );
                    nextResponse.cookies.set(
                        'g360_rt',
                        upgradedTokens.refreshToken,
                        { maxAge, path: '/', sameSite: 'lax' },
                    );
                }
            } catch {
                // Ignore malformed upstream JSON and pass the original body through.
            }
        }

        return nextResponse;
    } catch {
        return Response.json(
            { message: 'Unable to reach authentication service.' },
            { status: 502 },
        );
    }
}
