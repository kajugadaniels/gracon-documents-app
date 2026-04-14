'use client';

/**
 * Documents-native verification page form.
 */

import { useEffect, useEffectEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    const [documentNumber, setDocumentNumber] = useState('');
    const [documentNumberError, setDocumentNumberError] = useState<string>();
    const challengeMode =
        searchParams.get('challenge') === 'invitation'
            ? 'INVITATION'
            : 'STANDARD';
    const config = createVerificationFlowConfig(challengeMode);
    const controller = useVerificationFlow({
        challengeMode: config.challengeMode,
        getSuccessDescription: config.getSuccessDescription,
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

    function handleNidSubmit() {
        if (documentNumber.length !== 16) {
            const message = 'National ID must be exactly 16 digits';
            setDocumentNumberError(message);
            toast.error('Invalid National ID', { description: message });
            return;
        }

        setDocumentNumberError(undefined);
        controller.confirmDocumentNumber(documentNumber);
    }

    return (
        <VerificationFlow
            config={config}
            controller={controller}
            documentNumber={documentNumber}
            documentNumberError={documentNumberError}
            onDocumentNumberChange={(value) => {
                setDocumentNumber(value);
                if (documentNumberError) {
                    setDocumentNumberError(undefined);
                }
            }}
            onNidSubmit={handleNidSubmit}
            onContinue={continueAfterVerification}
            onDashboard={() => router.push('/documents')}
        />
    );
}
