'use client';

/**
 * Reducer-backed controller for the documents verification flow.
 */

import { useCallback, useReducer } from 'react';
import { AxiosError } from 'axios';
import { toast } from '@/components/ui';
import type {
    VerificationChallengeMode,
    VerificationResult,
} from '@/api/verification/verification-contract';
import { submitVerificationApi } from '@/api/verification/submit-verification.api';

export type VerifyStep = 'nid' | 'id-card' | 'selfie' | 'result';

type VerificationFlowState = {
    step: VerifyStep;
    documentNumber: string;
    idCardFile: File | null;
    selfieFile: File | null;
    idCardPreview: string | null;
    selfiePreview: string | null;
    idCaptured: boolean;
    selfieCaptured: boolean;
    result: VerificationResult | null;
    loading: boolean;
};

type VerificationFlowAction =
    | { type: 'CONFIRM_DOCUMENT_NUMBER'; documentNumber: string }
    | { type: 'CAPTURE_ID_CARD'; file: File; preview: string }
    | { type: 'CAPTURE_SELFIE'; file: File; preview: string }
    | { type: 'RETAKE_ID_CARD' }
    | { type: 'RETAKE_SELFIE' }
    | { type: 'SET_STEP'; step: VerifyStep }
    | { type: 'START_SUBMIT' }
    | { type: 'SET_RESULT'; result: VerificationResult }
    | { type: 'FINISH_SUBMIT' }
    | { type: 'RESET_FOR_RETRY' };

const INITIAL_STATE: VerificationFlowState = {
    step: 'nid',
    documentNumber: '',
    idCardFile: null,
    selfieFile: null,
    idCardPreview: null,
    selfiePreview: null,
    idCaptured: false,
    selfieCaptured: false,
    result: null,
    loading: false,
};

function reducer(
    state: VerificationFlowState,
    action: VerificationFlowAction,
): VerificationFlowState {
    switch (action.type) {
        case 'CONFIRM_DOCUMENT_NUMBER':
            return { ...state, documentNumber: action.documentNumber, step: 'id-card' };
        case 'CAPTURE_ID_CARD':
            return { ...state, idCardFile: action.file, idCardPreview: action.preview, idCaptured: true };
        case 'CAPTURE_SELFIE':
            return { ...state, selfieFile: action.file, selfiePreview: action.preview, selfieCaptured: true };
        case 'RETAKE_ID_CARD':
            return { ...state, idCardFile: null, idCardPreview: null, idCaptured: false };
        case 'RETAKE_SELFIE':
            return { ...state, selfieFile: null, selfiePreview: null, selfieCaptured: false };
        case 'SET_STEP':
            return { ...state, step: action.step };
        case 'START_SUBMIT':
            return { ...state, loading: true };
        case 'SET_RESULT':
            return { ...state, result: action.result, step: 'result', loading: false };
        case 'FINISH_SUBMIT':
            return { ...state, loading: false };
        case 'RESET_FOR_RETRY':
            return { ...INITIAL_STATE };
        default:
            return state;
    }
}

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
 * Owns the verification flow state machine for the documents app session.
 */
export function useVerificationFlow(options: {
    challengeMode: VerificationChallengeMode;
    getSuccessDescription: (result: VerificationResult) => string;
}) {
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

    const submitVerification = useCallback(async () => {
        if (!state.idCardFile || !state.selfieFile) {
            toast.error('Missing photos', {
                description: 'Please capture both your ID card and selfie.',
            });
            return null;
        }

        dispatch({ type: 'START_SUBMIT' });

        try {
            const response = await submitVerificationApi(
                state.documentNumber,
                state.idCardFile,
                state.selfieFile,
                options.challengeMode,
            );
            const result = 'data' in response.data ? response.data.data : response.data;

            persistUpgradedTokens(result);
            dispatch({ type: 'SET_RESULT', result });

            if (result.passed) {
                toast.success('Identity verified!', {
                    description: options.getSuccessDescription(result),
                });
            } else {
                toast.error('Verification failed', {
                    description:
                        result.failReason ??
                        'Please try again with better lighting.',
                });
            }

            return result;
        } catch (error) {
            dispatch({ type: 'FINISH_SUBMIT' });
            toast.error('Verification unavailable', {
                description: getErrorMessage(
                    error,
                    'Unable to verify your identity right now.',
                ),
            });
            return null;
        }
    }, [options, state.documentNumber, state.idCardFile, state.selfieFile]);

    const confirmDocumentNumber = useCallback((documentNumber: string) => {
        dispatch({ type: 'CONFIRM_DOCUMENT_NUMBER', documentNumber });
    }, []);
    const captureIdCard = useCallback((preview: string, file: File) => {
        dispatch({ type: 'CAPTURE_ID_CARD', preview, file });
    }, []);
    const captureSelfie = useCallback((preview: string, file: File) => {
        dispatch({ type: 'CAPTURE_SELFIE', preview, file });
    }, []);
    const retakeIdCard = useCallback(() => dispatch({ type: 'RETAKE_ID_CARD' }), []);
    const retakeSelfie = useCallback(() => dispatch({ type: 'RETAKE_SELFIE' }), []);
    const setStep = useCallback((step: VerifyStep) => dispatch({ type: 'SET_STEP', step }), []);
    const resetForRetry = useCallback(() => dispatch({ type: 'RESET_FOR_RETRY' }), []);

    return {
        ...state,
        confirmDocumentNumber,
        captureIdCard,
        captureSelfie,
        retakeIdCard,
        retakeSelfie,
        setStep,
        resetForRetry,
        submitVerification,
    };
}

export type VerificationFlowController = ReturnType<typeof useVerificationFlow>;
