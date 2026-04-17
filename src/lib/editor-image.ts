/**
 * Utilities for validating image URLs before they are stored in editor content.
 */

const BLOCKED_IMAGE_PROTOCOLS = new Set(['javascript:', 'data:', 'vbscript:', 'file:', 'blob:']);
const ALLOWED_IMAGE_PROTOCOLS = new Set(['https:', 'http:']);
const IMAGE_EXTENSION_PATTERN = /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i;
const SVG_EXTENSION_PATTERN = /\.svg(?:[?#].*)?$/i;
const CLOUDINARY_HOST_PATTERN = /(?:^|\.)cloudinary\.com$/i;

export type NormalizedEditorImage =
    | { ok: true; url: string; host: string; likelyImage: boolean }
    | { ok: false; error: string };

/**
 * Normalizes and validates an externally hosted editor image URL.
 *
 * @param value - Raw URL entered by the user.
 * @returns Normalized URL metadata or a user-facing validation error.
 */
export function normalizeEditorImageUrl(value: string): NormalizedEditorImage {
    const raw = value.trim();

    if (!raw) {
        return { ok: false, error: 'Enter an image URL before inserting it.' };
    }

    if (/[\u0000-\u001F\u007F]/.test(raw)) {
        return { ok: false, error: 'Image URLs cannot contain control characters.' };
    }

    if (raw.startsWith('//')) {
        return { ok: false, error: 'Use a full https:// image URL.' };
    }

    const protocolMatch = raw.match(/^([a-z][a-z0-9+.-]*):/i);
    if (protocolMatch) {
        const protocol = `${protocolMatch[1].toLowerCase()}:`;
        if (BLOCKED_IMAGE_PROTOCOLS.has(protocol) || !ALLOWED_IMAGE_PROTOCOLS.has(protocol)) {
            return { ok: false, error: 'Only http and https image URLs are allowed.' };
        }
    }

    try {
        const parsed = new URL(protocolMatch ? raw : `https://${raw}`);
        if (!ALLOWED_IMAGE_PROTOCOLS.has(parsed.protocol)) {
            return { ok: false, error: 'Only http and https image URLs are allowed.' };
        }
        if (parsed.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
            return { ok: false, error: 'Use an https:// image URL for production-safe documents.' };
        }
        const isLocalDevHost = ['localhost', '127.0.0.1'].includes(parsed.hostname);
        if (!isLocalDevHost && !parsed.hostname.includes('.')) {
            return { ok: false, error: 'Enter a complete image URL.' };
        }
        if (SVG_EXTENSION_PATTERN.test(parsed.pathname)) {
            return { ok: false, error: 'SVG images are not allowed in documents.' };
        }

        const likelyImage = IMAGE_EXTENSION_PATTERN.test(parsed.pathname)
            || CLOUDINARY_HOST_PATTERN.test(parsed.hostname);

        return {
            ok: true,
            url: parsed.toString(),
            host: parsed.hostname,
            likelyImage,
        };
    } catch {
        return { ok: false, error: 'Enter a valid image URL.' };
    }
}
