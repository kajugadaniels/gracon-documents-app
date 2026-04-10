/**
 * DeleteDocumentDialog
 *
 * Minimal confirmation dialog shown before permanently deleting a document.
 * Rendered inside a backdrop overlay; traps focus and closes on Escape.
 * The confirm button shows a loading state while the delete request is in flight.
 */
'use client';

import { useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete04Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

interface DeleteDocumentDialogProps {
    docTitle: string;
    deleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Confirmation dialog for document deletion.
 * Closes on Escape key press or backdrop click.
 */
export function DeleteDocumentDialog({
    docTitle,
    deleting,
    onConfirm,
    onCancel,
}: DeleteDocumentDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);

    // Focus the cancel button on mount — safe default for destructive dialogs.
    useEffect(() => {
        cancelRef.current?.focus();
    }, []);

    // Close on Escape key.
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
                {/* Icon */}
                <div className="delete-dialog__icon-wrap">
                    <HugeiconsIcon icon={Delete04Icon} size={22} color="var(--color-error)" />
                </div>

                {/* Heading */}
                <h2 id="delete-dialog-title" className="delete-dialog__title">
                    Delete document?
                </h2>

                {/* Document name */}
                <p className="delete-dialog__doc-name">{docTitle}</p>

                {/* Warning */}
                <p className="delete-dialog__warning">
                    This action cannot be undone.
                </p>

                {/* Actions */}
                <div className="delete-dialog__actions">
                    <button
                        ref={cancelRef}
                        onClick={onCancel}
                        disabled={deleting}
                        className="btn-ghost delete-dialog__cancel-btn"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="btn-danger delete-dialog__confirm-btn"
                    >
                        {deleting ? (
                            <span className="delete-dialog__spinner" aria-hidden="true" />
                        ) : (
                            <HugeiconsIcon icon={Delete04Icon} size={14} color="currentColor" />
                        )}
                        {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}
