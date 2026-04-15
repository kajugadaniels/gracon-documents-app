/**
 * Shared unauthorized-retry helper for auth-scoped API requests.
 */

import {
    AxiosHeaders,
    type AxiosHeaderValue,
    type AxiosRequestConfig,
} from 'axios';

export type RefreshOutcome =
    | { status: 'refreshed'; accessToken: string }
    | { status: 'unauthenticated' }
    | { status: 'failed' };

export type RetryableRequestConfig = AxiosRequestConfig & {
    _retry?: boolean;
};

export type UnauthorizedRetryError = {
    response?: { status?: number };
    config?: RetryableRequestConfig;
};

type UnauthorizedRetryDeps<TResponse> = {
    retryRequest: (config: RetryableRequestConfig) => Promise<TResponse>;
    refreshAccessToken: () => Promise<RefreshOutcome>;
    redirectToLogin: (intendedPath: string) => void;
    getIntendedPath: () => string;
};

/**
 * Returns whether a request qualifies for a single refresh-and-retry attempt.
 */
export function canRetryUnauthorizedRequest(
    error: UnauthorizedRetryError,
): error is UnauthorizedRetryError & { config: RetryableRequestConfig } {
    if (error.response?.status !== 401) {
        return false;
    }

    const config = error.config;
    if (!config) {
        return false;
    }

    return config._retry !== true;
}

/**
 * Applies the cross-app token refresh flow for one unauthorized request and
 * retries it once when refresh succeeds.
 */
export async function handleUnauthorizedRetry<TResponse>(
    error: UnauthorizedRetryError,
    deps: UnauthorizedRetryDeps<TResponse>,
): Promise<TResponse> {
    if (!canRetryUnauthorizedRequest(error)) {
        return Promise.reject(error);
    }

    const original = error.config;
    original._retry = true;

    const refresh = await deps.refreshAccessToken();
    if (refresh.status === 'refreshed') {
        original.headers = appendAuthorizationHeader(
            original.headers,
            refresh.accessToken,
        );
        return deps.retryRequest(original);
    }

    if (refresh.status === 'unauthenticated') {
        deps.redirectToLogin(deps.getIntendedPath());
    }

    return Promise.reject(error);
}

function appendAuthorizationHeader(
    headers: AxiosRequestConfig['headers'],
    accessToken: string,
): AxiosRequestConfig['headers'] {
    const normalized = new AxiosHeaders();

    if (headers instanceof AxiosHeaders) {
        headers.forEach((value: AxiosHeaderValue, key: string) => {
            normalized.set(key, value);
        });
    } else if (headers && typeof headers === 'object') {
        for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
            if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
            ) {
                normalized.set(key, String(value));
            }
        }
    }

    normalized.set('Authorization', `Bearer ${accessToken}`);
    return normalized;
}
