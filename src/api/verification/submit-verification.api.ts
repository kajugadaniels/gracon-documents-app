/**
 * Documents-app wrapper around the shared verification transport.
 *
 * This binds the shared verification client to the local auth proxy client so
 * invitation flows can use the same verification contract as the main app.
 */

import { authClient } from '@/api/client';
import { createVerificationClient } from './verification-client';
export type {
    SubmitVerificationResponse,
    VerificationChallengeMode,
    VerificationLockoutState,
    VerificationResult,
    VerificationStatusResponse,
} from './verification-contract';

const verificationClient = createVerificationClient(authClient);

export const submitVerificationApi = verificationClient.submitVerification;
