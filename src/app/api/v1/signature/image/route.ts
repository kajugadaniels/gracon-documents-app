/**
 * Same-origin proxy for the signature service current-signature-image endpoint.
 *
 * app/documents must not depend on direct cross-origin browser calls to
 * api/signature. This route forwards the shared session token and returns the
 * presigned URL payload used by inline document signature blocks.
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

async function fetchCurrentSignatureImage(accessToken: string) {
    return fetch(`${SIGNATURE_BASE}/signature/image`, {
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

        let imageResponse = await fetchCurrentSignatureImage(accessToken);

        if (
            (imageResponse.status === 401 || imageResponse.status === 403) &&
            refreshToken
        ) {
            const refreshed = await refreshSession(
                refreshToken,
                imageResponse.status === 403 ? 'upgrade' : 'refresh',
            );
            if (refreshed) {
                accessToken = refreshed.accessToken;
                refreshedTokens = refreshed;
                imageResponse = await fetchCurrentSignatureImage(accessToken);
            }
        }

        return forwardResponseWithSession(imageResponse, refreshedTokens);
    } catch {
        return NextResponse.json(
            { message: 'Signature image service unavailable' },
            { status: 503 },
        );
    }
}
