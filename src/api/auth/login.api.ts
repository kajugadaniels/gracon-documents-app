import { authClient } from '@/api/client';
import type { UserProfile } from '@/lib/store/auth.store';

export interface LoginPayload {
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    tokenType: 'full' | 'limited';
    data: {
        accessToken: string;
        refreshToken: string;
        user: UserProfile;
    };
}

export const loginApi = (payload: LoginPayload) =>
    authClient.post<LoginResponse>('/auth/login', payload);
