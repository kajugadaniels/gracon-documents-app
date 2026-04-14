/**
 * Documents-app wrapper around the shared verification status transport.
 */

import { authClient } from '@/api/client';
import { createVerificationClient } from './verification-client';
export type { VerificationStatusResponse } from './verification-contract';

const verificationClient = createVerificationClient(authClient);

export const getVerificationStatusApi = verificationClient.getVerificationStatus;
