/**
 * Signing BFF route for app/documents.
 *
 * The browser submits one same-origin request here. The route signs the frozen
 * document hash through api/signature, then records that signature with
 * api/documents before responding to the UI. This keeps session recovery,
 * service-to-service ordering, and partial-failure handling out of the modal.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
    applySessionCookies,
    clearSessionCookies,
    refreshSession,
    resolveAccessToken,
    type RefreshedTokens,
} from '@/lib/server/session-proxy';

const DOCUMENTS_BASE =
    process.env.NEXT_PUBLIC_DOCUMENTS_API_URL ??
    'http://localhost:3005/api/v1';
const SIGNATURE_BASE =
    process.env.NEXT_PUBLIC_SIGNATURE_API_URL ??
    'http://localhost:3002/api/v1';

type SignRouteContext = {
    params: Promise<{ documentId: string }>;
};

type SignRequestBody = {
    documentHash?: unknown;
    documentName?: unknown;
};

type SignatureServiceResponse = {
    signatureId?: unknown;
    signatureBytes?: unknown;
};

type UpstreamRequestResult = {
    response: Response;
    accessToken: string;
    refreshedTokens: RefreshedTokens | null;
};

function badRequest(message: string) {
    return NextResponse.json({ message }, { status: 400 });
}

async function parseSignBody(request: NextRequest) {
    const body = (await request.json().catch(() => null)) as SignRequestBody | null;
    const documentHash = body?.documentHash;
    const documentName = body?.documentName;

    if (typeof documentHash !== 'string' || !documentHash.trim()) {
        return { error: badRequest('Document hash is required.') };
    }

    if (typeof documentName !== 'string' || !documentName.trim()) {
        return { error: badRequest('Document name is required.') };
    }

    return {
        value: {
            documentHash: documentHash.trim(),
            documentName: documentName.trim(),
        },
    };
}

async function postSignatureService(input: {
    accessToken: string;
    documentHash: string;
    documentName: string;
}) {
    return fetch(`${SIGNATURE_BASE}/signature/signing/sign`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${input.accessToken}`,
        },
        body: JSON.stringify({
            documentHash: input.documentHash,
            documentName: input.documentName,
        }),
        cache: 'no-store',
    });
}

async function postDocumentsService(input: {
    accessToken: string;
    documentId: string;
    documentHash: string;
    signatureId: string;
}) {
    return fetch(`${DOCUMENTS_BASE}/documents/${input.documentId}/sign`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${input.accessToken}`,
        },
        body: JSON.stringify({
            documentHash: input.documentHash,
            signatureId: input.signatureId,
        }),
        cache: 'no-store',
    });
}

async function sendWithSessionRetry(
    input: {
        accessToken: string;
        refreshToken: string | null;
        refreshedTokens: RefreshedTokens | null;
    },
    send: (accessToken: string) => Promise<Response>,
): Promise<UpstreamRequestResult> {
    let accessToken = input.accessToken;
    let refreshedTokens = input.refreshedTokens;
    let response = await send(accessToken);

    if (
        (response.status === 401 || response.status === 403) &&
        input.refreshToken
    ) {
        const refreshed = await refreshSession(
            input.refreshToken,
            response.status === 403 ? 'upgrade' : 'refresh',
        );

        if (refreshed) {
            accessToken = refreshed.accessToken;
            refreshedTokens = refreshed;
            response = await send(accessToken);
        }
    }

    return { response, accessToken, refreshedTokens };
}

async function forwardUpstreamError(
    upstreamResponse: Response,
    refreshedTokens: RefreshedTokens | null,
) {
    const response = new NextResponse(await upstreamResponse.text(), {
        status: upstreamResponse.status,
        headers: {
            'Content-Type':
                upstreamResponse.headers.get('content-type') ?? 'application/json',
        },
    });

    if (upstreamResponse.status === 401) {
        return clearSessionCookies(response);
    }

    if (refreshedTokens) {
        return applySessionCookies(response, refreshedTokens);
    }

    return response;
}

export async function POST(request: NextRequest, context: SignRouteContext) {
    const parsed = await parseSignBody(request);
    if ('error' in parsed) return parsed.error;

    const { documentId } = await context.params;
    const { documentHash, documentName } = parsed.value;

    try {
        let { accessToken, refreshToken, refreshedTokens } =
            await resolveAccessToken(request, 'upgrade');

        if (!accessToken) {
            return clearSessionCookies(
                NextResponse.json({ message: 'Not authenticated' }, { status: 401 }),
            );
        }

        const signatureResult = await sendWithSessionRetry(
            { accessToken, refreshToken, refreshedTokens },
            (token) => postSignatureService({ accessToken: token, documentHash, documentName }),
        );

        accessToken = signatureResult.accessToken;
        refreshedTokens = signatureResult.refreshedTokens;

        if (!signatureResult.response.ok) {
            return forwardUpstreamError(signatureResult.response, refreshedTokens);
        }

        const signaturePayload =
            (await signatureResult.response.json()) as SignatureServiceResponse;
        const signatureId = signaturePayload.signatureId;
        const signatureBytes = signaturePayload.signatureBytes;

        if (typeof signatureId !== 'string' || !signatureId.trim()) {
            return NextResponse.json(
                { message: 'Signature service returned an incomplete response.' },
                { status: 502 },
            );
        }

        const documentResult = await sendWithSessionRetry(
            { accessToken, refreshToken, refreshedTokens },
            (token) =>
                postDocumentsService({
                    accessToken: token,
                    documentId,
                    documentHash,
                    signatureId,
                }),
        );

        refreshedTokens = documentResult.refreshedTokens;

        if (!documentResult.response.ok) {
            return forwardUpstreamError(documentResult.response, refreshedTokens);
        }

        const documentPayload = await documentResult.response.json();
        const response = NextResponse.json({
            ...documentPayload,
            signatureId,
            signatureBytes:
                typeof signatureBytes === 'string' ? signatureBytes : null,
        });

        if (refreshedTokens) {
            return applySessionCookies(response, refreshedTokens);
        }

        return response;
    } catch {
        return NextResponse.json(
            { message: 'Unable to complete document signing right now.' },
            { status: 502 },
        );
    }
}
