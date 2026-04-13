/**
 * DocumentFinaliseDialog
 *
 * Lets the owner finalise a draft while explicitly deciding whether their own
 * signature should be required. Finalisation no longer implies owner signing.
 */
'use client';

import { useEffect, useState } from 'react';

interface DocumentFinaliseDialogProps {
    acceptedSignerCount: number;
    open: boolean;
    onClose: () => void;
    onConfirm: (options: { requireOwnerSignature: boolean }) => Promise<void>;
}

/** Modal used to confirm finalisation and owner-signature requirement. */
export function DocumentFinaliseDialog({
    acceptedSignerCount,
    open,
    onClose,
    onConfirm,
}: DocumentFinaliseDialogProps) {
    const [requireOwnerSignature, setRequireOwnerSignature] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const canFinalise = requireOwnerSignature || acceptedSignerCount > 0;

    useEffect(() => {
        if (!open) {
            setRequireOwnerSignature(false);
            setSubmitting(false);
        }
    }, [open]);

    if (!open) {
        return null;
    }

    async function handleConfirm() {
        if (!canFinalise || submitting) {
            return;
        }

        setSubmitting(true);
        try {
            await onConfirm({ requireOwnerSignature });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div
            className="docs-finalise-dialog__backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="docs-finalise-dialog-title"
        >
            <div className="docs-finalise-dialog">
                <div className="docs-finalise-dialog__header">
                    <p className="docs-finalise-dialog__eyebrow">Finalise document</p>
                    <h2
                        id="docs-finalise-dialog-title"
                        className="docs-finalise-dialog__title"
                    >
                        Freeze content and choose required signers
                    </h2>
                    <p className="docs-finalise-dialog__copy">
                        Finalising stops further editing. Only explicitly required signers will be asked to sign.
                    </p>
                </div>

                <div className="docs-finalise-dialog__summary">
                    <div className="docs-finalise-dialog__summary-item">
                        <span>Accepted invited signers</span>
                        <strong>{acceptedSignerCount}</strong>
                    </div>
                    <div className="docs-finalise-dialog__summary-item">
                        <span>Owner signature required</span>
                        <strong>{requireOwnerSignature ? 'Yes' : 'No'}</strong>
                    </div>
                </div>

                <label className="docs-finalise-dialog__toggle">
                    <input
                        type="checkbox"
                        checked={requireOwnerSignature}
                        onChange={(event) => setRequireOwnerSignature(event.target.checked)}
                        disabled={submitting}
                    />
                    <span>
                        <strong>Require my signature before completion</strong>
                        <small>
                            Leave this off if only invited signers should sign and you will only lock later.
                        </small>
                    </span>
                </label>

                {!canFinalise ? (
                    <p className="docs-finalise-dialog__warning">
                        Add at least one accepted signer with signing access or require your own signature before finalising.
                    </p>
                ) : null}

                <div className="docs-finalise-dialog__actions">
                    <button
                        type="button"
                        className="ded-action-btn"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="ded-action-btn ded-action-btn--primary"
                        onClick={() => void handleConfirm()}
                        disabled={!canFinalise || submitting}
                    >
                        {submitting ? 'Finalising…' : 'Finalise document'}
                    </button>
                </div>
            </div>
        </div>
    );
}
