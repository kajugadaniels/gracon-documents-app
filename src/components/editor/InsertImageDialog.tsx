'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeEditorImageUrl } from '@/lib/editor-image';

export interface InsertImageDialogValues {
    alt: string;
    src: string;
    title: string;
}

interface InsertImageDialogProps {
    initialAlt?: string;
    initialSrc?: string;
    initialTitle?: string;
    onClose: () => void;
    onSubmit: (values: InsertImageDialogValues) => void;
}

type PreviewStatus = 'idle' | 'loading' | 'loaded' | 'error';

function ImageIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
                d="M4 3.5h12A2.5 2.5 0 0 1 18.5 6v8A2.5 2.5 0 0 1 16 16.5H4A2.5 2.5 0 0 1 1.5 14V6A2.5 2.5 0 0 1 4 3.5Zm0 1.5A1 1 0 0 0 3 6v6.24l3.02-2.64a1.75 1.75 0 0 1 2.37.06l1.22 1.17 2.3-2.82a1.75 1.75 0 0 1 2.68-.05L17 10.73V6a1 1 0 0 0-1-1H4Zm13 8.05-3.54-4.08a.25.25 0 0 0-.38.01l-3.31 4.06-2.42-2.31a.25.25 0 0 0-.34-.01L3 14.23A1 1 0 0 0 4 15h12a1 1 0 0 0 1-.95v-1ZM6.75 8.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z"
                fill="currentColor"
            />
        </svg>
    );
}

/**
 * Dialog for inserting externally hosted images into the TipTap editor.
 */
export function InsertImageDialog({
    initialAlt = '',
    initialSrc = '',
    initialTitle = '',
    onClose,
    onSubmit,
}: InsertImageDialogProps) {
    const [src, setSrc] = useState(initialSrc);
    const [alt, setAlt] = useState(initialAlt);
    const [title, setTitle] = useState(initialTitle);
    const [touched, setTouched] = useState(false);
    const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle');
    const inputRef = useRef<HTMLInputElement>(null);
    const normalized = useMemo(() => normalizeEditorImageUrl(src), [src]);
    const showError = touched && src.trim().length > 0 && !normalized.ok;
    const canSubmit = normalized.ok && previewStatus !== 'error';
    const previewUrl = normalized.ok ? normalized.url : '';

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="insert-image-dialog__backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="insert-image-dialog-title"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <form
                className="insert-image-dialog"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!normalized.ok) {
                        setTouched(true);
                        return;
                    }
                    onSubmit({ src: normalized.url, alt: alt.trim(), title: title.trim() });
                }}
            >
                <div className="insert-image-dialog__header">
                    <div className="insert-image-dialog__header-icon" aria-hidden="true">
                        <ImageIcon />
                    </div>
                    <div className="insert-image-dialog__header-copy">
                        <p className="insert-image-dialog__eyebrow">Image</p>
                        <h2 id="insert-image-dialog-title" className="insert-image-dialog__title">
                            Insert image
                        </h2>
                    </div>
                    <button
                        type="button"
                        className="insert-image-dialog__close"
                        onClick={onClose}
                        aria-label="Close image dialog"
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <p className="insert-image-dialog__copy">
                    Use a secure hosted image URL, such as a Cloudinary delivery URL. File upload should go through a signed upload API before it is stored in documents.
                </p>

                <label className={`insert-image-dialog__field${showError ? ' insert-image-dialog__field--error' : ''}`}>
                    <span>Image URL</span>
                    <input
                        ref={inputRef}
                        value={src}
                        onChange={(event) => {
                            setSrc(event.target.value);
                            setTouched(true);
                            setPreviewStatus('loading');
                        }}
                        onBlur={() => setTouched(true)}
                        placeholder="https://res.cloudinary.com/.../image/upload/file.jpg"
                        inputMode="url"
                        autoComplete="url"
                        autoFocus
                    />
                    <small className={showError ? 'insert-image-dialog__hint--error' : ''}>
                        {showError
                            ? normalized.error
                            : 'Allowed: https image URLs. Localhost http is accepted for development only.'}
                    </small>
                </label>

                <div className="insert-image-dialog__preview">
                    {previewUrl ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element -- External URL preview cannot use Next/Image without domain allowlisting. */}
                            <img
                                src={previewUrl}
                                alt=""
                                onLoad={() => setPreviewStatus('loaded')}
                                onError={() => setPreviewStatus('error')}
                            />
                            {previewStatus === 'loading' && (
                                <span className="insert-image-dialog__preview-status">Checking image…</span>
                            )}
                            {previewStatus === 'error' && (
                                <span className="insert-image-dialog__preview-status insert-image-dialog__preview-status--error">
                                    This image could not be loaded.
                                </span>
                            )}
                        </>
                    ) : (
                        <div className="insert-image-dialog__preview-empty">
                            <ImageIcon />
                            <span>Image preview will appear here</span>
                        </div>
                    )}
                </div>

                <div className="insert-image-dialog__meta-grid">
                    <label className="insert-image-dialog__field">
                        <span>Alt text</span>
                        <input
                            value={alt}
                            onChange={(event) => setAlt(event.target.value)}
                            placeholder="Describe the image for accessibility"
                        />
                    </label>
                    <label className="insert-image-dialog__field">
                        <span>Title</span>
                        <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Optional hover title"
                        />
                    </label>
                </div>

                <div className="insert-image-dialog__footer">
                    <p>Images are stored as references, not copied into the document JSON.</p>
                    <div className="insert-image-dialog__footer-actions">
                        <button type="button" className="ded-action-btn" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="ded-share-btn" disabled={!canSubmit}>
                            Insert image
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
