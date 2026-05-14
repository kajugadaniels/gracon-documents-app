const DEFAULT_ACCESS_TOKEN_COOKIE = 'g360_at';
const DEFAULT_REFRESH_TOKEN_COOKIE = 'g360_rt';
const DEFAULT_SESSION_HINT_COOKIE = 'session_active';

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
};
