/**
 * Signing CTA for the document editor header.
 *
 * Finalisation and signing are separate controls. Finalisation is owner-only,
 * while signing still depends on the current user's certificate state.
 */
'use client';

import type { DigitalCertificateActionStatus } from './use-digital-certificate-status';

interface DocEditorSignatureActionProps {
    certificateStatus: DigitalCertificateActionStatus;
    canFinalise: boolean;
    canLock: boolean;
    canSign: boolean;
    onApplyForDigitalSignature: () => void;
    onFinalise: () => void;
    onLock: () => void;
    onSign: () => void;
}

/** Renders the correct signing-related action for owners and invited signers. */
export function DocEditorSignatureAction({
    certificateStatus,
    canFinalise,
    canLock,
    canSign,
    onApplyForDigitalSignature,
    onFinalise,
    onLock,
    onSign,
}: DocEditorSignatureActionProps) {
    if (canFinalise) {
        return (
            <button onClick={onFinalise} className="ded-action-btn ded-action-btn--primary">
                Finalise document
            </button>
        );
    }

    if (canLock) {
        return (
            <button onClick={onLock} className="ded-action-btn ded-action-btn--primary">
                Lock document
            </button>
        );
    }

    if (!canSign) {
        return null;
    }

    if (certificateStatus === 'checking') {
        return (
            <button className="ded-action-btn" disabled>
                Checking certificate…
            </button>
        );
    }

    if (certificateStatus !== 'active') {
        return (
            <button
                onClick={onApplyForDigitalSignature}
                className="ded-action-btn ded-action-btn--certificate"
                title="Open your digital signature setup in the main app"
            >
                Apply for digital signature
            </button>
        );
    }

    return (
        <button onClick={onSign} className="ded-action-btn ded-action-btn--primary">
            Sign document
        </button>
    );
}
