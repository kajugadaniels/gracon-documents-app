const AUTH_SERVICE_BASE =
    process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'http://localhost:3000/api/v1';

export async function POST(request: Request) {
    try {
        const body = await request.text();
        const response = await fetch(`${AUTH_SERVICE_BASE}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body,
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
            {
                message: 'Unable to reach authentication service.',
            },
            { status: 502 },
        );
    }
}
