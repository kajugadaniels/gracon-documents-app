/**
 * Proxies multipart verification submissions from the documents app to the
 * auth service while preserving the uploaded files and caller token.
 */

const AUTH_SERVICE_BASE =
    process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'http://localhost:3000/api/v1';

export async function POST(request: Request) {
    try {
        const incomingForm = await request.formData();
        const upstreamForm = new FormData();

        for (const [key, value] of incomingForm.entries()) {
            upstreamForm.append(key, value);
        }

        const response = await fetch(`${AUTH_SERVICE_BASE}/verification/submit`, {
            method: 'POST',
            headers: {
                Authorization: request.headers.get('Authorization') ?? '',
            },
            body: upstreamForm,
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
