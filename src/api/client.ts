import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const AUTH_BASE = '/api/v1';
const DOCS_BASE = process.env.NEXT_PUBLIC_DOCS_API_URL ?? 'http://localhost:3005/api/v1';

// ─── Auth client — only for token refresh ────────────────────────────────────
export const authClient = axios.create({ baseURL: AUTH_BASE, timeout: 15_000 });

// ─── Documents API client — used for all document operations ─────────────────
const docsClient = axios.create({ baseURL: DOCS_BASE, timeout: 30_000 });

docsClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

docsClient.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
        const original = error.config as AxiosRequestConfig & { _retry?: boolean };
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                const newToken = await refreshTokens();
                if (newToken) {
                    original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
                    return docsClient(original);
                }
            } catch { clearAndRedirect(); }
        }
        return Promise.reject(error);
    },
);

export { docsClient as apiClient };

function getToken(): string | null {
    try {
        const { useAuthStore } = require('@/lib/store/auth.store');
        return useAuthStore.getState().accessToken ?? sessionStorage.getItem('doc_at');
    } catch { return null; }
}

async function refreshTokens(): Promise<string | null> {
    try {
        const { useAuthStore } = require('@/lib/store/auth.store');
        const rt = useAuthStore.getState().refreshToken ?? sessionStorage.getItem('doc_rt');
        if (!rt) return null;
        const res = await authClient.post('/auth/refresh', { refreshToken: rt });
        const { accessToken, refreshToken } = res.data?.data ?? res.data;
        useAuthStore.getState().setTokens(accessToken, refreshToken);
        return accessToken;
    } catch { return null; }
}

function clearAndRedirect() {
    try {
        const { useAuthStore } = require('@/lib/store/auth.store');
        useAuthStore.getState().clearAuth();
    } catch { }
    if (typeof window !== 'undefined') window.location.href = '/login';
}
