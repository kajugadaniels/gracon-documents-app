const DEFAULT_ACCESS_TOKEN_COOKIE = 'g360_at';
const DEFAULT_REFRESH_TOKEN_COOKIE = 'g360_rt';
const DEFAULT_SESSION_HINT_COOKIE = 'session_active';
const DEFAULT_ACCESS_TOKEN_TTL = '15m';
const DEFAULT_REFRESH_TOKEN_TTL = '1d';

type CookieSameSite = 'strict' | 'lax' | 'none';

function getEnv(name: string): string | undefined {
    return process.env[name]?.trim() || undefined;
}

export const documentAuthCookiePolicy = {
    accessCookieName:
        getEnv('NEXT_PUBLIC_AUTH_ACCESS_COOKIE_NAME') ?? DEFAULT_ACCESS_TOKEN_COOKIE,
    refreshCookieName:
        getEnv('NEXT_PUBLIC_AUTH_REFRESH_COOKIE_NAME') ?? DEFAULT_REFRESH_TOKEN_COOKIE,
    sessionHintCookieName:
        getEnv('NEXT_PUBLIC_AUTH_SESSION_HINT_COOKIE_NAME') ??
        DEFAULT_SESSION_HINT_COOKIE,
    cookieDomain: getEnv('NEXT_PUBLIC_AUTH_COOKIE_DOMAIN'),
    cookieSecure:
        getEnv('NEXT_PUBLIC_AUTH_COOKIE_SECURE') === 'true' ||
        process.env.NODE_ENV === 'production',
    cookieSameSite: normalizeSameSite(getEnv('NEXT_PUBLIC_AUTH_COOKIE_SAME_SITE')),
    accessTokenMaxAgeSeconds: parseDurationSeconds(
        getEnv('NEXT_PUBLIC_AUTH_ACCESS_TOKEN_TTL'),
        DEFAULT_ACCESS_TOKEN_TTL,
    ),
    refreshTokenMaxAgeSeconds: parseDurationSeconds(
        getEnv('NEXT_PUBLIC_AUTH_REFRESH_TOKEN_TTL'),
        DEFAULT_REFRESH_TOKEN_TTL,
    ),
};

function normalizeSameSite(value: string | undefined): CookieSameSite {
    const normalized = value?.toLowerCase();
    if (normalized === 'strict') return 'strict';
    if (normalized === 'none') return 'none';
    return 'lax';
}

function parseDurationSeconds(value: string | undefined, fallback: string): number {
    const source = value ?? fallback;
    const match = /^(\d+)([smhd])$/.exec(source.trim().toLowerCase());

    if (!match) return parseDurationSeconds(fallback, '1d');

    const amount = Number(match[1]);
    const unit = match[2];

    if (unit === 's') return amount;
    if (unit === 'm') return amount * 60;
    if (unit === 'h') return amount * 60 * 60;
    return amount * 60 * 60 * 24;
}

export function shouldUseMainAppLogin(): boolean {
    const explicit = getEnv('NEXT_PUBLIC_DOCUMENTS_USE_MAIN_APP_LOGIN');

    if (explicit === 'true') return true;
    if (explicit === 'false') return false;

    return process.env.NODE_ENV === 'production';
}

export function shouldAllowReadableDocumentAuthCookies(): boolean {
    const explicit = getEnv('NEXT_PUBLIC_ALLOW_DEV_READABLE_AUTH_COOKIES');

    if (explicit === 'true') return true;
    if (explicit === 'false') return false;

    return process.env.NODE_ENV !== 'production';
}

function serializeClientCookie(name: string): string {
    const parts = [
        `${name}=`,
        'path=/',
        'max-age=0',
        'expires=Thu, 01 Jan 1970 00:00:00 GMT',
        `SameSite=${documentAuthCookiePolicy.cookieSameSite}`,
    ];

    if (documentAuthCookiePolicy.cookieDomain) {
        parts.push(`domain=${documentAuthCookiePolicy.cookieDomain}`);
    }
    if (documentAuthCookiePolicy.cookieSecure) {
        parts.push('Secure');
    }

    return parts.join('; ');
}

export function clearDocumentAuthCookies(): void {
    if (typeof document === 'undefined') return;

    document.cookie = serializeClientCookie(documentAuthCookiePolicy.accessCookieName);
    document.cookie = serializeClientCookie(documentAuthCookiePolicy.refreshCookieName);
    document.cookie = serializeClientCookie(documentAuthCookiePolicy.sessionHintCookieName);
}
