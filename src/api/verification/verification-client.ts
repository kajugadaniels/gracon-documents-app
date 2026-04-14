/**
 * Small verification transport factory for the documents app.
 *
 * This keeps invitation verification transport reusable without coupling it to
 * the invitation page component or to one specific proxy route file.
 */

import type { AxiosResponse } from 'axios';
import type {
    SubmitVerificationResponse,
    VerificationChallengeMode,
    VerificationStatusResponse,
} from './verification-contract';

interface VerificationHttpClient {
    get<T>(url: string): Promise<AxiosResponse<T>>;
    post<T>(
        url: string,
        data?: FormData | Record<string, unknown>,
        config?: { headers?: Record<string, string>; timeout?: number },
    ): Promise<AxiosResponse<T>>;
}

/**
 * Creates verification endpoint helpers bound to the provided HTTP client.
 */
export function createVerificationClient(client: VerificationHttpClient) {
    return {
        submitVerification(
            documentNumber: string,
            idCard: File,
            selfie: File,
            challengeMode?: VerificationChallengeMode,
        ) {
            const form = new FormData();
            form.append('documentNumber', documentNumber);
            form.append('idCard', idCard);
            form.append('selfie', selfie);

            if (challengeMode) {
                form.append('challengeMode', challengeMode);
            }

            return client.post<SubmitVerificationResponse>(
                '/verification/submit',
                form,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 60_000,
                },
            );
        },

        getVerificationStatus() {
            return client.get<VerificationStatusResponse>('/verification/status');
        },
    };
}
