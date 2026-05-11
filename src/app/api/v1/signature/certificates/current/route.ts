/**
 * Same-origin proxy for the signature service current-certificate endpoint.
 *
 * The browser must not call api/signature directly from app/documents because
 * deployment origins differ. This route forwards the shared session token,
 * refreshes it when needed, and preserves the upstream certificate status.
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

async function fetchCurrentCertificate(accessToken: string) {
    return fetch(`${SIGNATURE_BASE}/signature/certificates/current`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
    });
}

export async function GET(request: NextRequest) {
    try {
        let { accessToken, refreshToken, refreshedTokens } =
            await resolveAccessToken(request);

        if (!accessToken) {
            return clearSessionCookies(
                NextResponse.json({ message: 'Not authenticated' }, { status: 401 }),
            );
        }

        let certificateResponse = await fetchCurrentCertificate(accessToken);

        if (
            (certificateResponse.status === 401 || certificateResponse.status === 403) &&
            refreshToken
        ) {
            const refreshed = await refreshSession(
                refreshToken,
                certificateResponse.status === 403 ? 'upgrade' : 'refresh',
            );
            if (refreshed) {
                accessToken = refreshed.accessToken;
                refreshedTokens = refreshed;
                certificateResponse = await fetchCurrentCertificate(accessToken);
            }
        }

        return forwardResponseWithSession(certificateResponse, refreshedTokens);
    } catch {
        return NextResponse.json(
            { message: 'Unable to reach signature service.' },
            { status: 502 },
        );
    }
}
