/**
 * Defines the configurable copy and action labels for each verification mode.
 */

import type {
    VerificationChallengeMode,
    VerificationResult,
} from '@/api/verification/verification-contract';

export type VerificationFlowConfig = {
    challengeMode: VerificationChallengeMode;
    identity: {
        title: string;
        description: string;
    };
    idCard: {
        title: string;
        description: string;
        backLabel: string;
        continueLabel: string;
        disabledLabel: string;
    };
    selfie: {
        title: string;
        description: string;
        backLabel: string;
        continueLabel: string;
        disabledLabel: string;
        loadingText: string;
    };
    result: {
        successActionLabel: string;
        retryActionLabel: string;
        dashboardActionLabel: string;
        lockedActionLabel: string;
    };
    getSuccessDescription: (result: VerificationResult) => string;
};

/**
 * Returns the verification UI configuration for a specific challenge mode.
 */
export function createVerificationFlowConfig(
    challengeMode: VerificationChallengeMode,
): VerificationFlowConfig {
    const sharedCaptureCopy = {
        idCard: {
            title: 'Photograph your ID card',
            description:
                'Hold your physical ID card in front of the back camera. Align it within the dashed border and ensure all text is readable.',
            backLabel: 'Back',
            continueLabel: 'Continue to selfie',
            disabledLabel: 'Capture ID card first',
        },
        selfie: {
            title: 'Take a selfie',
            description:
                'Look directly at the front camera. Position your face within the oval guide. Remove glasses if possible for the best result.',
            backLabel: 'Back',
            continueLabel: 'Submit for verification',
            disabledLabel: 'Capture selfie first',
            loadingText: 'Verifying...',
        },
    };

    if (challengeMode === 'INVITATION') {
        return {
            challengeMode,
            identity: {
                title: 'Confirm your identity for this invitation',
                description:
                    'Enter your 16-digit National ID number to continue the secure invitation challenge. We will compare it against the one registered on your account.',
            },
            ...sharedCaptureCopy,
            result: {
                successActionLabel: 'Return to invitation',
                retryActionLabel: 'Try again',
                dashboardActionLabel: 'Documents',
                lockedActionLabel: 'Return to documents',
            },
            getSuccessDescription: (result) =>
                `Score: ${Math.round(result.compositeScore)}% — invitation verification is complete.`,
        };
    }

    return {
        challengeMode,
        identity: {
            title: 'Confirm your ID number',
            description:
                'Enter your 16-digit National ID number to begin. We&apos;ll compare it against the one you registered with.',
        },
        ...sharedCaptureCopy,
        result: {
            successActionLabel: 'Continue to documents',
            retryActionLabel: 'Try again',
            dashboardActionLabel: 'Documents',
            lockedActionLabel: 'Return to documents',
        },
        getSuccessDescription: (result) =>
            `Score: ${Math.round(result.compositeScore)}% — you can now access your documents workspace.`,
    };
}
