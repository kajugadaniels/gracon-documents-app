'use client';

/**
 * Documents-app adapter around the shared verification flow controller.
 */

import { AxiosError } from 'axios';
import { toast } from '@/components/ui';
import {
    useVerificationFlowController,
    type VerificationChallengeMode,
    type VerificationFlowController,
    type VerificationResult,
} from '@gracon/verification-ui';
import { submitVerificationApi } from '@/api/verification/submit-verification.api';

function getErrorMessage(error: unknown, fallback: string) {
    const axiosError = error as AxiosError<{
        message?: string | { message?: string };
        error?: string;
    }>;
    const payload = axiosError.response?.data?.message;
    if (typeof payload === 'string' && payload.trim()) return payload;
    if (
        payload &&
        typeof payload === 'object' &&
        typeof payload.message === 'string' &&
        payload.message.trim()
    ) {
        return payload.message;
    }
    const fallbackMessage = axiosError.response?.data?.error;
    return typeof fallbackMessage === 'string' && fallbackMessage.trim()
        ? fallbackMessage
        : fallback;
}

function persistUpgradedTokens(result: VerificationResult) {
    if (typeof document === 'undefined' || !result.upgradedTokens) return;

    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `g360_at=${result.upgradedTokens.accessToken}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
    document.cookie = `g360_rt=${result.upgradedTokens.refreshToken}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

/**
 * Provides the documents verification controller with local session fallback.
 */
export function useVerificationFlow(options: {
    challengeMode: VerificationChallengeMode;
    getSuccessDescription: (result: VerificationResult) => string;
}) {
    return useVerificationFlowController({
        challengeMode: options.challengeMode,
        getSuccessDescription: options.getSuccessDescription,
        submitVerification: async ({
            documentNumber,
            idCardFile,
            selfieFile,
            challengeMode,
        }) => {
            const response = await submitVerificationApi(
                documentNumber,
                idCardFile,
                selfieFile,
                challengeMode,
            );
            return response.data;
        },
        notifications: {
            onMissingPhotos: (description) => {
                toast.error('Missing photos', { description });
            },
            onSuccess: (description) => {
                toast.success('Identity verified!', { description });
            },
            onFailure: (description) => {
                toast.error('Verification failed', { description });
            },
            onError: (description) => {
                toast.error('Verification unavailable', { description });
            },
        },
        normalizeErrorMessage: getErrorMessage,
        onVerificationPassed: persistUpgradedTokens,
    });
}

export type { VerificationFlowController };
