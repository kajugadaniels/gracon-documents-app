'use client';

/**
 * Renders the locked-document verification QR at the bottom of the paper.
 *
 * Inline signature blocks own signer names, images, and signed dates. This
 * footer is intentionally verification-only so locked documents do not show a
 * second competing signature card.
 */
import { useEffect, useMemo, useState } from 'react';
import { toDataURL } from 'qrcode';
import type {
    DocumentCompletedSignature,
    DocumentSignatureSnapshot,
} from '@/api/documents.api';
import { DOCS_URL } from '@/lib/session';

interface DocumentSignatureBlockProps {
    documentId: string;
    documentTitle: string;
    snapshot: DocumentSignatureSnapshot | null;
    completedSignatures: DocumentCompletedSignature[];
    canAdjustPlacement?: boolean;
    onSnapshotUpdated?: (snapshot: DocumentSignatureSnapshot | null) => void;
}

export function DocumentSignatureBlock({
    documentId,
    documentTitle,
}: DocumentSignatureBlockProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

    const verificationUrl = useMemo(() => {
        const url = new URL('/verify', DOCS_URL);
        url.searchParams.set('documentId', documentId);
        return url.toString();
    }, [documentId]);

    useEffect(() => {
        let ignore = false;

        toDataURL(verificationUrl, {
            margin: 1,
            width: 144,
            color: { dark: '#16103a', light: '#ffffff' },
        })
            .then((dataUrl) => {
                if (!ignore) setQrCodeUrl(dataUrl);
            })
            .catch(() => {
                if (!ignore) setQrCodeUrl(null);
            });

        return () => {
            ignore = true;
        };
    }, [verificationUrl]);

    return (
        <div className="document-signature-overlay" aria-hidden="false">
            <aside
                className="document-verification-footer"
                aria-label={`Verification QR code for ${documentTitle}`}
            >
                <div className="document-verification-footer__qr">
                    {qrCodeUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={qrCodeUrl}
                            alt={`QR code to verify ${documentTitle}`}
                            width={72}
                            height={72}
                            draggable={false}
                        />
                    ) : (
                        <span>QR</span>
                    )}
                </div>
                <div className="document-verification-footer__copy">
                    <span>Scan to verify</span>
                    <strong>{documentTitle}</strong>
                    <small>Confirm this signed document is authentic and unmodified.</small>
                </div>
            </aside>
        </div>
    );
}
