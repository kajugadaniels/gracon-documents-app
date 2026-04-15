/**
 * Documents-app destination labels layered on the shared verification flow copy.
 */

import {
    createVerificationFlowConfig as createSharedVerificationFlowConfig,
    type VerificationFlowConfig,
    type VerificationChallengeMode,
} from '@gracon/verification-ui';
import type { VerificationResult } from '@/api/verification/verification-contract';

export type { VerificationFlowConfig };

/**
 * Returns the verification UI configuration for a specific challenge mode.
 */
export function createVerificationFlowConfig(
    challengeMode: VerificationChallengeMode,
): VerificationFlowConfig {
    return createSharedVerificationFlowConfig(challengeMode, {
        dashboardActionLabel: 'Documents',
        standardSuccessActionLabel: 'Continue to documents',
        standardLockedActionLabel: 'Return to documents',
        standardSuccessDescription: (result: VerificationResult) =>
            `Score: ${Math.round(result.compositeScore)}% — you can now access your documents workspace.`,
    });
}
