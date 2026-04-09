import { create } from 'zustand';

export interface UserProfile {
    userId: string;
    email: string;
    phoneNumber: string | null;
    imageUrl: string | null;
    surName: string;
    postNames: string;
    sex: string;
    isIdVerified: boolean;
    idVerifiedAt: string | null;
    createdAt: string;
}

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: UserProfile | null;
    isHydrated: boolean;

    setTokens: (access: string, refresh: string) => void;
    setUser: (user: UserProfile) => void;
    clearAuth: () => void;
    hydrate: () => void;
    isLoggedIn: () => boolean;
}

const KEYS = { AT: 'doc_at', RT: 'doc_rt', USER: 'doc_user' } as const;

const ss = {
    get: (k: string) => { try { return typeof window !== 'undefined' ? sessionStorage.getItem(k) : null; } catch { return null; } },
    set: (k: string, v: string) => { try { if (typeof window !== 'undefined') sessionStorage.setItem(k, v); } catch { } },
    remove: (k: string) => { try { if (typeof window !== 'undefined') sessionStorage.removeItem(k); } catch { } },
};

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken: null,
    refreshToken: null,
    user: null,
    isHydrated: false,

    setTokens: (accessToken, refreshToken) => {
        ss.set(KEYS.AT, accessToken);
        ss.set(KEYS.RT, refreshToken);
        set({ accessToken, refreshToken });
    },

    setUser: (user) => {
        ss.set(KEYS.USER, JSON.stringify(user));
        set({ user });
    },

    clearAuth: () => {
        [KEYS.AT, KEYS.RT, KEYS.USER].forEach(ss.remove);
        // Clear session cookie
        if (typeof document !== 'undefined') {
            document.cookie = 'doc_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        set({ accessToken: null, refreshToken: null, user: null });
    },

    hydrate: () => {
        const at = ss.get(KEYS.AT);
        const rt = ss.get(KEYS.RT);
        const raw = ss.get(KEYS.USER);
        let user: UserProfile | null = null;
        if (raw) { try { user = JSON.parse(raw); } catch { } }
        set({ accessToken: at, refreshToken: rt, user, isHydrated: true });
    },

    isLoggedIn: () => {
        const { accessToken, user } = get();
        return !!(accessToken && user);
    },
}));