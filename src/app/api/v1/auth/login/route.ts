import { NextResponse } from 'next/server';
import {
    documentAuthCookiePolicy,
    shouldAllowReadableDocumentAuthCookies,
} from '@/lib/auth/session-cookie-policy';

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
                    const commonOptions = {
                        path: '/',
                        sameSite: documentAuthCookiePolicy.cookieSameSite,
                        secure: documentAuthCookiePolicy.cookieSecure,
                        domain: documentAuthCookiePolicy.cookieDomain,
                        httpOnly: !shouldAllowReadableDocumentAuthCookies(),
                    };

                    // Local documents login remains useful in development. In
                    // production, login should normally happen in app/app and
                    // any credential cookies written here are HttpOnly.
                    nextResponse.cookies.set(documentAuthCookiePolicy.accessCookieName, accessToken, {
                        ...commonOptions,
                        maxAge: documentAuthCookiePolicy.accessTokenMaxAgeSeconds,
                    });
                    nextResponse.cookies.set(documentAuthCookiePolicy.refreshCookieName, refreshToken, {
                        ...commonOptions,
                        maxAge: documentAuthCookiePolicy.refreshTokenMaxAgeSeconds,
                    });
                    nextResponse.cookies.set(documentAuthCookiePolicy.sessionHintCookieName, '1', {
                        maxAge: documentAuthCookiePolicy.refreshTokenMaxAgeSeconds,
                        path: '/',
                        sameSite: documentAuthCookiePolicy.cookieSameSite,
                        secure: documentAuthCookiePolicy.cookieSecure,
                        domain: documentAuthCookiePolicy.cookieDomain,
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
