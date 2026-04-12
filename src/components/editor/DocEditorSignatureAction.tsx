/**
 * Signing CTA for the document editor header.
 *
 * The button never exposes finalise/sign actions until the current user has
 * an active certificate; the backend still enforces this during signing.
 */
'use client';

import type { DigitalCertificateActionStatus } from './use-digital-certificate-status';

interface DocEditorSignatureActionProps {
    certificateStatus: DigitalCertificateActionStatus;
    isFinalised: boolean;
    onApplyForDigitalSignature: () => void;
    onFinalise: () => void;
}

/** Renders the correct signing-related action for owners and invited signers. */
export function DocEditorSignatureAction({
    certificateStatus,
    isFinalised,
    onApplyForDigitalSignature,
    onFinalise,
}: DocEditorSignatureActionProps) {
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
        <button onClick={onFinalise} className="ded-action-btn ded-action-btn--primary">
            {isFinalised ? 'Sign document' : 'Finalise & sign'}
        </button>
    );
}
