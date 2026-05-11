/**
 * Signing CTA for the document editor header.
 *
 * Finalisation and signing are separate controls. Finalisation is owner-only,
 * while signing uses one readiness state from the documents signing flow.
 */
'use client';

export type SigningActionStatus =
    | 'checking'
    | 'ready'
    | 'needs_certificate'
    | 'needs_identity_verification'
    | 'blocked'
    | 'not-required';

interface DocEditorSignatureActionProps {
    signingStatus: SigningActionStatus;
    canFinalise: boolean;
    canLock: boolean;
    canSign: boolean;
    onApplyForDigitalSignature: () => void;
    onCompleteIdentityVerification: () => void;
    onFinalise: () => void;
    onLock: () => void;
    onSign: () => void;
}

/** Renders the correct signing-related action for owners and invited signers. */
export function DocEditorSignatureAction({
    signingStatus,
    canFinalise,
    canLock,
    canSign,
    onApplyForDigitalSignature,
    onCompleteIdentityVerification,
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

    if (signingStatus === 'checking') {
        return (
            <button className="ded-action-btn" disabled>
                Checking signing…
            </button>
        );
    }

    if (signingStatus === 'needs_identity_verification') {
        return (
            <button
                onClick={onCompleteIdentityVerification}
                className="ded-action-btn ded-action-btn--certificate"
                title="Complete identity verification in the main app"
            >
                Verify identity
            </button>
        );
    }

    if (signingStatus === 'needs_certificate') {
        return (
            <button
                onClick={onApplyForDigitalSignature}
                className="ded-action-btn ded-action-btn--certificate"
                title="Open your digital signature setup in the main app"
            >
                Set up signature
            </button>
        );
    }

    if (signingStatus !== 'ready') {
        return (
            <button className="ded-action-btn" disabled>
                Signing unavailable
            </button>
        );
    }

    return (
        <button onClick={onSign} className="ded-action-btn ded-action-btn--primary">
            Sign document
        </button>
    );
}
