'use client';

import { useEffect, useRef, useState } from 'react';

export interface InsertLinkDialogValues {
    text: string;
    url: string;
}

interface InsertLinkDialogProps {
    open: boolean;
    mode: 'create' | 'edit';
    text: string;
    url: string;
    error: string | null;
    canRemove: boolean;
    onClose: () => void;
    onSubmit: (values: InsertLinkDialogValues) => void;
    onRemove: () => void;
}

/**
 * Selection-aware link dialog used by Insert -> Link and the keyboard shortcut.
 */
export function InsertLinkDialog({
    open,
    mode,
    text,
    url,
    error,
    canRemove,
    onClose,
    onSubmit,
    onRemove,
}: InsertLinkDialogProps) {
    const [draftText, setDraftText] = useState(text);
    const [draftUrl, setDraftUrl] = useState(url);
    const urlInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        window.setTimeout(() => urlInputRef.current?.focus(), 0);
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose, open]);

    if (!open) return null;

    return (
        <div
            className="insert-link-dialog__backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="insert-link-dialog-title"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <form
                className="insert-link-dialog"
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit({ text: draftText, url: draftUrl });
                }}
            >
                <div className="insert-link-dialog__header">
                    <div>
                        <p className="insert-link-dialog__eyebrow">Insert</p>
                        <h2 id="insert-link-dialog-title" className="insert-link-dialog__title">
                            {mode === 'edit' ? 'Edit link' : 'Add a link'}
                        </h2>
                    </div>
                    <button
                        type="button"
                        className="insert-link-dialog__close"
                        onClick={onClose}
                        aria-label="Close link dialog"
                    >
                        ×
                    </button>
                </div>

                <p className="insert-link-dialog__copy">
                    Link selected text or insert a clean, safe hyperlink into the document.
                </p>

                <label className="insert-link-dialog__field">
                    <span>Link</span>
                    <input
                        ref={urlInputRef}
                        value={draftUrl}
                        onChange={(event) => setDraftUrl(event.target.value)}
                        placeholder="https://example.com or name@example.com"
                        inputMode="url"
                        autoComplete="url"
                    />
                </label>

                <label className="insert-link-dialog__field">
                    <span>Display text</span>
                    <input
                        value={draftText}
                        onChange={(event) => setDraftText(event.target.value)}
                        placeholder="Text shown in the document"
                    />
                    <small>Leave empty to use the link itself.</small>
                </label>

                {error && (
                    <p className="insert-link-dialog__error" role="alert">
                        {error}
                    </p>
                )}

                <div className="insert-link-dialog__actions">
                    {canRemove && (
                        <button
                            type="button"
                            className="insert-link-dialog__remove"
                            onClick={onRemove}
                        >
                            Remove link
                        </button>
                    )}
                    <span className="insert-link-dialog__spacer" />
                    <button type="button" className="ded-action-btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className="ded-share-btn">
                        {mode === 'edit' ? 'Apply changes' : 'Insert link'}
                    </button>
                </div>
            </form>
        </div>
    );
}
