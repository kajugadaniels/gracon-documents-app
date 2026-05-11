/**
 * Same-origin signing proxy for app/documents.
 *
 * The browser sends the frozen document hash here; this route resolves or
 * upgrades the shared session before forwarding the request to api/signature.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
    clearSessionCookies,
    forwardResponseWithSession,
    refreshSession,
    resolveAccessToken,
} from '@/lib/server/session-proxy';

const SIGNATURE_BASE =
    process.env.NEXT_PUBLIC_SIGNATURE_API_URL ??
    'http://localhost:3002/api/v1';

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

export async function POST(request: NextRequest) {
    const body = await request.text();

    try {
        let { accessToken, refreshToken, refreshedTokens } =
            await resolveAccessToken(request, 'upgrade');

        if (!accessToken) {
            return clearSessionCookies(
                NextResponse.json({ message: 'Not authenticated' }, { status: 401 }),
            );
        }

        let signatureResponse = await signDocument(body, accessToken);

        if (
            (signatureResponse.status === 401 || signatureResponse.status === 403) &&
            refreshToken
        ) {
            const refreshed = await refreshSession(
                refreshToken,
                signatureResponse.status === 403 ? 'upgrade' : 'refresh',
            );
            if (refreshed) {
                accessToken = refreshed.accessToken;
                refreshedTokens = refreshed;
                signatureResponse = await signDocument(body, accessToken);
            }
        }

        return forwardResponseWithSession(signatureResponse, refreshedTokens);
    } catch {
        return NextResponse.json(
            { message: 'Unable to reach signature service.' },
            { status: 502 },
        );
    }
}
