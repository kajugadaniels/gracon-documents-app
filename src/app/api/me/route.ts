import { NextRequest } from 'next/server';

const MAIN_APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL ?? 'http://localhost:4000';

function buildResponseHeaders(response: Response) {
    const headers = new Headers();
    const contentType = response.headers.get('content-type');

    if (contentType) {
        headers.set('content-type', contentType);
    }

    const responseHeaders = response.headers as Headers & {
        getSetCookie?: () => string[];
    };

    const setCookies = responseHeaders.getSetCookie?.();
    if (setCookies?.length) {
        for (const cookie of setCookies) {
            headers.append('set-cookie', cookie);
        }
    } else {
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
            headers.append('set-cookie', setCookie);
        }
    }

    return headers;
}

export async function GET(request: NextRequest) {
    try {
        const response = await fetch(`${MAIN_APP_URL}/api/me`, {
            headers: {
                cookie: request.headers.get('cookie') ?? '',
            },
            cache: 'no-store',
        });

        return new Response(await response.text(), {
            status: response.status,
            headers: buildResponseHeaders(response),
        });
    } catch {
        return Response.json(
            { error: 'Main app unavailable' },
            { status: 502 },
        );
    }
}
