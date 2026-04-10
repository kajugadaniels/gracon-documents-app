/**
 * GET /api/v1/users/search?q=...
 *
 * Proxy to the documents service user-search endpoint.
 * Forwards the Authorization header so the documents service can validate the
 * token via its VerifiedUserGuard.
 * Query param `q` is passed through unchanged — validation happens at the service.
 */

const DOCS_SERVICE_BASE =
    process.env.NEXT_PUBLIC_DOCS_API_URL ?? 'http://localhost:3005/api/v1';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') ?? '';

        const upstreamUrl = new URL(`${DOCS_SERVICE_BASE}/users/search`);
        upstreamUrl.searchParams.set('q', q);

        const response = await fetch(upstreamUrl.toString(), {
            method: 'GET',
            headers: {
                // Forward the bearer token so the documents service can guard the route.
                Authorization: request.headers.get('Authorization') ?? '',
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        return new Response(await response.text(), {
            status: response.status,
            headers: {
                'Content-Type':
                    response.headers.get('content-type') ?? 'application/json',
            },
        });
    } catch {
        return Response.json(
            { message: 'Unable to reach documents service.' },
            { status: 502 },
        );
    }
}
