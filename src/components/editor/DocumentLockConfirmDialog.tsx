/**
 * Confirmation dialog for permanently locking a fully signed document.
 */
'use client';

interface DocumentLockConfirmDialogProps {
    open: boolean;
    submitting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/** Shows the irreversible lock warning before the owner locks the document. */
export function DocumentLockConfirmDialog({
    open,
    submitting,
    onCancel,
    onConfirm,
}: DocumentLockConfirmDialogProps) {
    if (!open) return null;

    return (
        <div
            className="docs-finalise-dialog__backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="docs-lock-dialog-title"
        >
            <div className="docs-finalise-dialog">
                <div className="docs-finalise-dialog__header">
                    <p className="docs-finalise-dialog__eyebrow">Lock document</p>
                    <h2 id="docs-lock-dialog-title" className="docs-finalise-dialog__title">
                        Permanently lock this signed document?
                    </h2>
                    <p className="docs-finalise-dialog__copy">
                        After locking, the document becomes immutable. The verification QR code will be attached for authenticity checks.
                    </p>
                </div>

                <p className="docs-finalise-dialog__warning">
                    This action should only be done after you have reviewed the signed content and confirmed all required signatures are complete.
                </p>

                <div className="docs-finalise-dialog__actions">
                    <button
                        type="button"
                        className="ded-action-btn"
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="ded-action-btn ded-action-btn--primary"
                        onClick={onConfirm}
                        disabled={submitting}
                    >
                        {submitting ? 'Locking…' : 'Yes, lock document'}
                    </button>
                </div>
            </div>
        </div>
    );
}
