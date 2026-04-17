/**
 * Utilities for normalizing links before they are written into the editor
 * document model. Keeping this pure makes the security rules testable outside
 * React and ProseMirror.
 */

const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'vbscript:', 'file:']);
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_PATTERN = /^(?:www\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+(?:[/?#].*)?$/i;

export type NormalizedEditorLink =
    | { ok: true; url: string }
    | { ok: false; error: string };

/**
 * Normalizes user-entered links for safe editor storage.
 *
 * @param value - Raw user input from the insert-link dialog.
 * @returns A normalized URL or a user-facing validation error.
 */
export function normalizeEditorLinkUrl(value: string): NormalizedEditorLink {
    const raw = value.trim();

    if (!raw) {
        return { ok: false, error: 'Enter a link before applying it.' };
    }

    if (/[\u0000-\u001F\u007F]/.test(raw)) {
        return { ok: false, error: 'Links cannot contain control characters.' };
    }

    if (raw.startsWith('//')) {
        return { ok: false, error: 'Use a full https:// link instead of a protocol-relative URL.' };
    }

    const protocolMatch = raw.match(/^([a-z][a-z0-9+.-]*):/i);
    if (protocolMatch) {
        const protocol = `${protocolMatch[1].toLowerCase()}:`;

        if (BLOCKED_PROTOCOLS.has(protocol) || !ALLOWED_PROTOCOLS.has(protocol)) {
            return { ok: false, error: 'Only http, https, email, and phone links are allowed.' };
        }

        if (protocol === 'mailto:') {
            const email = raw.slice('mailto:'.length).split('?')[0];
            if (!EMAIL_PATTERN.test(email)) {
                return { ok: false, error: 'Enter a valid email address.' };
            }
            return { ok: true, url: raw };
        }

        if (protocol === 'tel:') {
            const phone = raw.slice('tel:'.length);
            if (!/^\+?[0-9().\-\s]{5,24}$/.test(phone)) {
                return { ok: false, error: 'Enter a valid phone number.' };
            }
            return { ok: true, url: raw };
        }

        try {
            const parsed = new URL(raw);
            if (!parsed.hostname || !parsed.hostname.includes('.')) {
                return { ok: false, error: 'Enter a complete website address.' };
            }
            return { ok: true, url: parsed.toString() };
        } catch {
            return { ok: false, error: 'Enter a valid website address.' };
        }
    }

    if (EMAIL_PATTERN.test(raw)) {
        return { ok: true, url: `mailto:${raw}` };
    }

    if (DOMAIN_PATTERN.test(raw)) {
        try {
            return { ok: true, url: new URL(`https://${raw}`).toString() };
        } catch {
            return { ok: false, error: 'Enter a valid website address.' };
        }
    }

    return { ok: false, error: 'Enter a valid website, email, or phone link.' };
}
