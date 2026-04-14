/**
 * Proxies verification status requests from the documents app to the auth
 * service while forwarding the caller's bearer token.
 */

const AUTH_SERVICE_BASE =
    process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'http://localhost:3000/api/v1';

export async function GET(request: Request) {
    try {
        const response = await fetch(`${AUTH_SERVICE_BASE}/verification/status`, {
            method: 'GET',
            headers: {
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
            { message: 'Unable to reach authentication service.' },
            { status: 502 },
        );
    }
}
