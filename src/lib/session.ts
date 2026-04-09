/**
 * Session utilities for app/documents.
 *
 * app/documents does not have its own authentication.
 * The user authenticates in app/app (port 4000) which writes
 * two cookies: g360_at (access token) and g360_rt (refresh token).
 *
 * These cookies are readable here because both apps run on the same
 * host (localhost in dev, same root domain in production).
 *
 * All token refresh operations go through app/app's /api/refresh route
 * to keep cookie management in one place.
 */

export const APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL ?? 'http://localhost:4000';
export const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? 'http://localhost:4002';

/**
 * Reads the access token from the shared cookie.
 * Returns null if not present — caller should redirect to login.
 */
export function getAccessToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)g360_at=([^;]+)/);
    return match?.[1] ?? null;
}

/**
 * Redirects the user to app/app login with a ?next param
 * so they are sent back to their intended page after login.
 */
export function redirectToLogin(intendedPath = '/documents'): void {
    if (typeof window === 'undefined') return;
    const next = `${DOCS_URL}${intendedPath}`;
    const login = `${APP_URL}/login?next=${encodeURIComponent(next)}`;
    window.location.href = login;
}

/**
 * Refreshes the access token by calling app/app's /api/refresh route.
 * Returns the new access token or null on failure.
 */
export async function refreshAccessToken(): Promise<string | null> {
    try {
        const res = await fetch(`${APP_URL}/api/refresh`, {
            method: 'POST',
            credentials: 'include', // sends the g360_rt cookie
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.accessToken ?? null;
    } catch {
        return null;
    }
}

/**
 * Fetches the current user profile from app/app's /api/me route.
 * Returns null if the session is invalid.
 */
export async function fetchCurrentUser() {
    try {
        const res = await fetch(`${APP_URL}/api/me`, {
            credentials: 'include',
            cache: 'no-store',
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}
