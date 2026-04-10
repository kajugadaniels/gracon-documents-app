/**
 * DeleteDocumentDialog
 *
 * Confirmation dialog shown before permanently deleting a document.
 * Closes on Escape or backdrop click. Confirm button enters a loading
 * state while the delete request is in flight.
 */
'use client';

import { useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete04Icon } from '@hugeicons/core-free-icons';

interface DeleteDocumentDialogProps {
    docTitle: string;
    deleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Renders a centered confirmation dialog with a blurred backdrop.
 * The cancel button is auto-focused — safe default for destructive actions.
 */
export function DeleteDocumentDialog({
    docTitle,
    deleting,
    onConfirm,
    onCancel,
}: DeleteDocumentDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);

    // Auto-focus cancel on open — the safe default for destructive dialogs.
    useEffect(() => {
        cancelRef.current?.focus();
    }, []);

    // Close on Escape unless a delete is already in flight.
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape' && !deleting) onCancel();
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [deleting, onCancel]);

    return (
        <div
            className="delete-dialog-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget && !deleting) onCancel(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
        >
            <div className="delete-dialog">
                {/* Top accent stripe */}
                <div className="delete-dialog__stripe" aria-hidden="true" />

                {/* Icon */}
                <div className="delete-dialog__icon-wrap" aria-hidden="true">
                    <HugeiconsIcon icon={Delete04Icon} size={24} color="#fff" />
                </div>

                {/* Copy */}
                <h2 id="delete-dialog-title" className="delete-dialog__title">
                    Delete this document?
                </h2>
                <p className="delete-dialog__doc-name" title={docTitle}>
                    {docTitle}
                </p>
                <p className="delete-dialog__warning">
                    This will permanently remove the document and cannot be undone.
                </p>

                {/* Divider */}
                <div className="delete-dialog__divider" aria-hidden="true" />

                {/* Actions */}
                <div className="delete-dialog__actions">
                    <button
                        ref={cancelRef}
                        onClick={onCancel}
                        disabled={deleting}
                        className="delete-dialog__cancel-btn"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="delete-dialog__confirm-btn"
                    >
                        {deleting ? (
                            <>
                                <span className="delete-dialog__spinner" aria-hidden="true" />
                                Deleting…
                            </>
                        ) : (
                            <>
                                <HugeiconsIcon icon={Delete04Icon} size={14} color="currentColor" />
                                Delete
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
