import { authClient } from '@/api/client';

interface LoginUser {
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
        user: LoginUser;
    };
}

export const loginApi = (payload: LoginPayload) =>
    authClient.post<LoginResponse>('/auth/login', payload);
