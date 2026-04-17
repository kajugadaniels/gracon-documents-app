import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const AUTH_BASE =
    process.env.NEXT_PUBLIC_AUTH_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3000/api/v1';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
    'image/avif',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
]);

interface CloudinaryUploadResponse {
    secure_url?: string;
    public_id?: string;
    bytes?: number;
    width?: number;
    height?: number;
    format?: string;
    resource_type?: string;
    error?: { message?: string };
}

function getCloudinaryConfig() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const folder = process.env.CLOUDINARY_EDITOR_IMAGES_FOLDER ?? 'gracon/documents/editor-images';

    if (!cloudName || !apiKey || !apiSecret) {
        return null;
    }

    return { cloudName, apiKey, apiSecret, folder };
}

function signCloudinaryParams(params: Record<string, string>, apiSecret: string) {
    const payload = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join('&');

    return crypto
        .createHash('sha1')
        .update(`${payload}${apiSecret}`)
        .digest('hex');
}

async function requireAuthenticatedUser(request: NextRequest) {
    const accessToken = request.cookies.get('g360_at')?.value ?? null;

    if (!accessToken) {
        return false;
    }

    try {
        const response = await fetch(`${AUTH_BASE}/users/profile`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
        });

        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Uploads a validated editor image to Cloudinary using server-side credentials.
 */
export async function POST(request: NextRequest) {
    const config = getCloudinaryConfig();
    if (!config) {
        return NextResponse.json(
            { error: 'Image upload is not configured.' },
            { status: 503 },
        );
    }

    const isAuthenticated = await requireAuthenticatedUser(request);
    if (!isAuthenticated) {
        return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Upload an image file.' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json(
            { error: 'Only AVIF, GIF, JPEG, PNG, and WebP images are allowed.' },
            { status: 415 },
        );
    }

    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
            { error: 'Image must be smaller than 8 MB.' },
            { status: 413 },
        );
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const uploadParams = {
        folder: config.folder,
        overwrite: 'false',
        timestamp,
        unique_filename: 'true',
    };
    const signature = signCloudinaryParams(uploadParams, config.apiSecret);
    const cloudinaryForm = new FormData();

    cloudinaryForm.set('file', file);
    cloudinaryForm.set('api_key', config.apiKey);
    cloudinaryForm.set('folder', uploadParams.folder);
    cloudinaryForm.set('overwrite', uploadParams.overwrite);
    cloudinaryForm.set('timestamp', uploadParams.timestamp);
    cloudinaryForm.set('unique_filename', uploadParams.unique_filename);
    cloudinaryForm.set('signature', signature);

    let uploadResponse: Response;
    let payload: CloudinaryUploadResponse;

    try {
        uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
            {
                method: 'POST',
                body: cloudinaryForm,
                cache: 'no-store',
            },
        );
        payload = await uploadResponse.json() as CloudinaryUploadResponse;
    } catch {
        return NextResponse.json(
            { error: 'Cloudinary upload service is unavailable.' },
            { status: 502 },
        );
    }

    if (!uploadResponse.ok || !payload.secure_url) {
        return NextResponse.json(
            { error: payload.error?.message ?? 'Failed to upload image.' },
            { status: 502 },
        );
    }

    return NextResponse.json({
        url: payload.secure_url,
        publicId: payload.public_id,
        bytes: payload.bytes,
        width: payload.width,
        height: payload.height,
        format: payload.format,
        resourceType: payload.resource_type,
    });
}
