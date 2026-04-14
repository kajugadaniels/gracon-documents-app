/**
 * Verification transport contract for the documents app.
 *
 * This mirrors the frozen auth contract so invitation verification can use the
 * same request and response semantics as the main app.
 */

export type VerificationChallengeMode = 'STANDARD' | 'INVITATION';

export interface VerificationLockoutState {
    maxAttempts: number;
    attemptWindowHours: number;
    retryAvailableAt: string | null;
    retryAfterSeconds: number | null;
}

export interface VerificationIdInfo {
    fullName: string;
    dateOfBirth: string;
    documentNumber: string;
}

export interface VerificationResult {
    success: boolean;
    passed: boolean;
    compositeScore: number;
    faceScore: number;
    livenessScore: number;
    documentMatch: boolean;
    message: string;
    failReason: string | null;
    attemptsUsed: number;
    attemptsRemaining: number;
    lockout: VerificationLockoutState;
    idInfo?: VerificationIdInfo;
    upgradedTokens?: {
        accessToken: string;
        refreshToken: string;
    };
    challengeMode?: VerificationChallengeMode;
}

export interface SubmitVerificationResponse {
    success: boolean;
    data: VerificationResult;
}

export interface VerificationStatusResponse {
    isIdVerified: boolean;
    attemptsUsed: number;
    attemptsRemaining: number;
    canAttempt: boolean;
    lastAttemptAt: string | null;
    lockout: VerificationLockoutState;
}
