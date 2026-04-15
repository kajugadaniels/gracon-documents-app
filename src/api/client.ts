import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, refreshAccessToken, redirectToLogin } from '@/lib/session';
import { handleUnauthorizedRetry } from './auth-retry';

const DOCS_BASE = process.env.NEXT_PUBLIC_DOCS_API_URL ?? 'http://localhost:3005/api/v1';
const AUTH_BASE = '/api/v1';

export const apiClient = axios.create({
    baseURL: DOCS_BASE,
    timeout: 30_000,
    withCredentials: true, // sends cookies on every request
});

export const authClient = axios.create({
    baseURL: AUTH_BASE,
    timeout: 30_000,
    withCredentials: true,
});

// Attach access token from shared cookie on every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Auth-scoped proxy routes still need the bearer token forwarded explicitly.
authClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// On 401 — attempt refresh via app/app, then retry once
apiClient.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) =>
        handleUnauthorizedRetry(error as AxiosError & { config?: AxiosRequestConfig & { _retry?: boolean } }, {
            retryRequest: (config) => apiClient(config),
            refreshAccessToken: async () => {
                const refresh = await refreshAccessToken();
                return refresh.status === 'refreshed'
                    ? {
                          status: 'refreshed' as const,
                          accessToken: refresh.accessToken,
                      }
                    : refresh.status === 'unauthenticated'
                      ? { status: 'unauthenticated' as const }
                      : { status: 'failed' as const };
            },
            redirectToLogin,
            getIntendedPath: () =>
                `${window.location.pathname}${window.location.search}${window.location.hash}`,
        }),
);

authClient.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) =>
        handleUnauthorizedRetry(error as AxiosError & { config?: AxiosRequestConfig & { _retry?: boolean } }, {
            retryRequest: (config) => authClient(config),
            refreshAccessToken: async () => {
                const refresh = await refreshAccessToken();
                return refresh.status === 'refreshed'
                    ? {
                          status: 'refreshed' as const,
                          accessToken: refresh.accessToken,
                      }
                    : refresh.status === 'unauthenticated'
                      ? { status: 'unauthenticated' as const }
                      : { status: 'failed' as const };
            },
            redirectToLogin,
            getIntendedPath: () =>
                `${window.location.pathname}${window.location.search}${window.location.hash}`,
        }),
);
