/**
 * Documents-app verification routing helpers.
 */

import type { VerificationChallengeMode } from '@/api/verification/verification-contract';

export type VerificationRedirect =
    | { kind: 'internal'; destination: '/documents' }
    | { kind: 'external'; destination: string };

/**
 * Resolves where the documents app should send the user after verification.
 */
export function resolveDocumentsVerificationRedirect(
    next: string | null,
    currentOrigin: string,
): VerificationRedirect {
    if (!next) {
        return { kind: 'internal', destination: '/documents' };
    }

    try {
        const targetUrl = new URL(next);
        if (targetUrl.origin === currentOrigin) {
            return { kind: 'external', destination: targetUrl.toString() };
        }
    } catch {
        // Fall through to the documents index when the target is invalid.
    }

    return { kind: 'internal', destination: '/documents' };
}

/**
 * Returns whether the invitation verification flow should auto-return to the
 * review page after a successful verification result.
 */
export function shouldAutoReturnInvitationVerification(
    challengeMode: VerificationChallengeMode,
    passed: boolean,
): boolean {
    return challengeMode === 'INVITATION' && passed;
}
