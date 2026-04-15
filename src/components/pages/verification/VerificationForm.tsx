'use client';

/**
 * Documents-native verification page form.
 */

import { useEffect, useEffectEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVerificationDocumentNumber } from '@gracon/verification-ui';
import { VerificationFlow } from './VerificationFlow';
import { createVerificationFlowConfig } from './verification-flow-config';
import { useVerificationFlow } from './use-verification-flow';
import { toast } from '@/components/ui';
import { getAccessToken, redirectToLogin } from '@/lib/session';

/**
 * Renders the verification flow inside the documents workspace.
 */
export function VerificationForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const challengeMode =
        searchParams.get('challenge') === 'invitation'
            ? 'INVITATION'
            : 'STANDARD';
    const config = createVerificationFlowConfig(challengeMode);
    const controller = useVerificationFlow({
        challengeMode: config.challengeMode,
        getSuccessDescription: config.getSuccessDescription,
    });
    const documentNumberState = useVerificationDocumentNumber({
        onConfirm: controller.confirmDocumentNumber,
        onInvalidLength: (message) => {
            toast.error('Invalid National ID', { description: message });
        },
    });

    useEffect(() => {
        if (getAccessToken()) return;

        const intendedPath =
            `${window.location.pathname}${window.location.search}${window.location.hash}`;
        redirectToLogin(intendedPath);
    }, []);

    function continueAfterVerification() {
        const next = searchParams.get('next');

        if (!next) {
            router.push('/documents');
            return;
        }

        try {
            const docsOrigin = window.location.origin;
            const targetUrl = new URL(next);
            if (targetUrl.origin === docsOrigin) {
                window.location.href = targetUrl.toString();
                return;
            }
        } catch {
            // Fall back to the documents index when next is not a safe URL.
        }

        router.push('/documents');
    }

    const continueAfterVerificationEvent = useEffectEvent(
        continueAfterVerification,
    );

    useEffect(() => {
        if (challengeMode !== 'INVITATION' || !controller.result?.passed) {
            return;
        }

        const timer = window.setTimeout(() => {
            continueAfterVerificationEvent();
        }, 900);

        return () => {
            window.clearTimeout(timer);
        };
    }, [
        challengeMode,
        controller.result?.passed,
    ]);

    return (
        <VerificationFlow
            config={config}
            controller={controller}
            documentNumber={documentNumberState.documentNumber}
            documentNumberError={documentNumberState.documentNumberError}
            onDocumentNumberChange={documentNumberState.setDocumentNumber}
            onNidSubmit={documentNumberState.submitDocumentNumber}
            onContinue={continueAfterVerification}
            onDashboard={() => router.push('/documents')}
        />
    );
}
