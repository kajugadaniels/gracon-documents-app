/**
 * Client helpers for app/documents signature-service proxies.
 *
 * These helpers call same-origin Next.js routes so browser CORS policy never
 * blocks signature status checks from the documents frontend.
 */
import { authClient } from './client';

export type DigitalCertificateStatus = 'active' | 'missing' | 'unavailable';

export interface CertificateResponse {
    id: string;
    serialNumber: string;
    subjectCN: string;
    notBefore: string;
    notAfter: string;
    certificatePem: string;
    isRevoked: boolean;
    isExpired: boolean;
    daysRemaining: number;
}

function isUsableCertificate(certificate: CertificateResponse) {
    return !certificate.isRevoked && !certificate.isExpired;
}

/**
 * Returns whether the current user can sign with an active digital certificate.
 */
export async function getDigitalCertificateStatus(): Promise<DigitalCertificateStatus> {
    try {
        const response = await authClient.get<CertificateResponse>(
            '/signature/certificates/current',
            { validateStatus: (status) => status < 500 },
        );

        if (response.status === 404) return 'missing';
        if (response.status !== 200) return 'unavailable';

        return isUsableCertificate(response.data) ? 'active' : 'missing';
    } catch {
        return 'unavailable';
    }
}
