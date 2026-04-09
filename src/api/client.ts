import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, refreshAccessToken, redirectToLogin } from '@/lib/session';

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

// On 401 — attempt refresh via app/app, then retry once
apiClient.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
        const original = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;

            const newToken = await refreshAccessToken();
            if (newToken) {
                original.headers = {
                    ...original.headers,
                    Authorization: `Bearer ${newToken}`,
                };
                return apiClient(original);
            }

            // Refresh failed — send user back to app/app login
            redirectToLogin(window.location.pathname);
            return Promise.reject(error);
        }

        return Promise.reject(error);
    },
);
