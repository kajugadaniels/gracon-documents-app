import { NextRequest } from 'next/server';

const MAIN_APP_URL =
    process.env.NEXT_PUBLIC_MAIN_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:4000';

function getSetCookies(response: Response) {
    const responseHeaders = response.headers as Headers & {
        getSetCookie?: () => string[];
    };

    const setCookies = responseHeaders.getSetCookie?.();
    if (setCookies?.length) return setCookies;

    const setCookie = response.headers.get('set-cookie');
    return setCookie ? [setCookie] : [];
}

function buildResponseHeaders(response: Response, forwardedCookies: string[] = []) {
    const headers = new Headers();
    const contentType = response.headers.get('content-type');

    if (contentType) {
        headers.set('content-type', contentType);
    }

    const seen = new Set<string>();

    for (const cookie of [...forwardedCookies, ...getSetCookies(response)]) {
        if (!seen.has(cookie)) {
            headers.append('set-cookie', cookie);
            seen.add(cookie);
        }
    }

    return headers;
}

function mergeCookieHeader(baseCookieHeader: string, setCookies: string[]) {
    const cookieMap = new Map<string, string>();

    for (const cookiePart of baseCookieHeader.split(/;\s*/)) {
        if (!cookiePart) continue;
        const separatorIndex = cookiePart.indexOf('=');
        if (separatorIndex === -1) continue;

        const name = cookiePart.slice(0, separatorIndex).trim();
        const value = cookiePart.slice(separatorIndex + 1);

        if (name) cookieMap.set(name, value);
    }

    for (const setCookie of setCookies) {
        const [cookiePair, ...attributes] = setCookie.split(';');
        const separatorIndex = cookiePair.indexOf('=');
        if (separatorIndex === -1) continue;

        const name = cookiePair.slice(0, separatorIndex).trim();
        const value = cookiePair.slice(separatorIndex + 1);
        const isExpired = attributes.some((attribute) => {
            const [rawKey, rawValue = ''] = attribute.split('=');
            return rawKey.trim().toLowerCase() === 'max-age' && rawValue.trim() === '0';
        });

        if (!name) continue;

        if (isExpired || value === '') cookieMap.delete(name);
        else cookieMap.set(name, value);
    }

    return Array.from(cookieMap.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
}

export async function GET(request: NextRequest) {
    const cookieHeader = request.headers.get('cookie') ?? '';

    try {
        let profileResponse = await fetch(`${MAIN_APP_URL}/api/me`, {
            headers: {
                cookie: cookieHeader,
            },
            cache: 'no-store',
        });

        if (profileResponse.status !== 401) {
            return new Response(await profileResponse.text(), {
                status: profileResponse.status,
                headers: buildResponseHeaders(profileResponse),
            });
        }

        const refreshResponse = await fetch(`${MAIN_APP_URL}/api/refresh`, {
            method: 'POST',
            headers: {
                cookie: cookieHeader,
            },
            cache: 'no-store',
        });

        const refreshCookies = getSetCookies(refreshResponse);

        if (!refreshResponse.ok) {
            return new Response(await refreshResponse.text(), {
                status: refreshResponse.status,
                headers: buildResponseHeaders(refreshResponse),
            });
        }

        const refreshedCookieHeader = mergeCookieHeader(cookieHeader, refreshCookies);

        profileResponse = await fetch(`${MAIN_APP_URL}/api/me`, {
            headers: {
                cookie: refreshedCookieHeader,
            },
            cache: 'no-store',
        });

        return new Response(await profileResponse.text(), {
            status: profileResponse.status,
            headers: buildResponseHeaders(profileResponse, refreshCookies),
        });
    } catch {
        return Response.json(
            { error: 'Main app unavailable' },
            { status: 502 },
        );
    }
}
