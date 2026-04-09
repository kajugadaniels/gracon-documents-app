'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from '@/components/ui';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { SpreadsheetEditor } from '@/components/editor/SpreadsheetEditor';
import { SigningModal } from '@/components/documents/SigningModal';
import { DocumentSignatureBlock } from '@/components/documents/DocumentSignatureBlock';
import { DocumentPaperSheet } from '@/components/documents/DocumentPaperSheet';
import {
    getDocument, autosaveDocument, updateDocumentMeta, finaliseDocument,
    type DocumentDetail,
} from '@/api/documents.api';

const AUTOSAVE_INTERVAL_MS = 30_000; // 30 seconds

function getErrorMessage(error: unknown, fallback: string) {
    const message = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;

    return typeof message === 'string' && message.trim() ? message : fallback;
}

export default function EditDocumentPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [doc, setDoc] = useState<DocumentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [editingTitle, setEditingTitle] = useState(false);
    const [title, setTitle] = useState('');
    const [showSigning, setShowSigning] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    const contentRef = useRef<Record<string, unknown> | null>(null);
    const wordCntRef = useRef(0);
    const dirtyRef = useRef(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load document
    useEffect(() => {
        let ignore = false;

        setLoading(true);
        setLoadError(null);

        getDocument(id, true)
            .then(d => {
                if (ignore) return;
                setDoc(d);
                setTitle(d.title);
                contentRef.current = d.content;
            })
            .catch((error: unknown) => {
                if (ignore) return;

                const message = getErrorMessage(
                    error,
                    'Failed to load document.',
                );
                setLoadError(message);
                toast.error(message);
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [id, retryKey]);

    // Autosave logic
    const save = useCallback(async (force = false) => {
        if (!dirtyRef.current && !force) return;
        if (!contentRef.current) return;
        if (doc?.status !== 'DRAFT') return;

        setSaveStatus('saving');
        dirtyRef.current = false;
        try {
            await autosaveDocument(id, contentRef.current, wordCntRef.current);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch {
            setSaveStatus('error');
            dirtyRef.current = true;
        }
    }, [id, doc?.status]);

    // Set up autosave interval
    useEffect(() => {
        const interval = setInterval(() => { void save(); }, AUTOSAVE_INTERVAL_MS);
        return () => { clearInterval(interval); void save(); };
    }, [save]);

    // Save on content change (debounced)
    const handleContentChange = useCallback((
        content: Record<string, unknown>,
        wordCount: number,
    ) => {
        contentRef.current = content;
        wordCntRef.current = wordCount;
        dirtyRef.current = true;
        setSaveStatus('idle');

        // Debounced save — 3s after last keystroke
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => { void save(); }, 3000);
    }, [save]);

    // Title save
    async function handleTitleSave() {
        setEditingTitle(false);
        if (title.trim() === doc?.title) return;
        try {
            const updated = await updateDocumentMeta(id, { title: title.trim() || 'Untitled' });
            setDoc(prev => prev ? { ...prev, title: updated.title } : prev);
            setTitle(updated.title);
        } catch { toast.error('Failed to update title.'); }
    }

    // Finalise and open signing modal
    async function handleFinalise() {
        if (!doc) return;
        if (doc.status !== 'DRAFT') { setShowSigning(true); return; }

        // Save current content first
        await save(true);

        try {
            const finalised = await finaliseDocument(id);
            setDoc(prev => prev ? { ...prev, ...finalised, status: 'FINALISED', contentHash: finalised.contentHash } : prev);
            toast.success('Document finalised. Now sign it to lock it permanently.');
            setShowSigning(true);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to finalise document.';
            toast.error(msg);
        }
    }

    if (loading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(91,35,255,0.2)', borderTopColor: 'var(--color-primary)', animation: 'btn-spin 0.7s linear infinite' }} />
            </div>
        );
    }

    if (!doc) {
        return (
            <div className="glass" style={{ maxWidth: 720, margin: '60px auto 0', borderRadius: 'var(--radius-xl)', padding: '28px 24px', display: 'grid', gap: 14, textAlign: 'center' }}>
                <div>
                    <p style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        Unable to open this document
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        {loadError ?? 'The editor could not load the requested document.'}
                    </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => setRetryKey((value) => value + 1)} className="btn-primary" style={{ fontSize: 12 }}>
                        Retry
                    </button>
                    <button onClick={() => router.push('/documents')} className="btn-ghost" style={{ fontSize: 12 }}>
                        Back to documents
                    </button>
                </div>
            </div>
        );
    }

    const isReadOnly = doc.status !== 'DRAFT';
    const isLocked = doc.status === 'LOCKED';
    const isFinalised = doc.status === 'FINALISED';
    const isPaperDocument = doc.type === 'RICH_TEXT';
    const signatureStrip = isLocked ? (
        <DocumentSignatureBlock
            documentId={doc.id}
            documentTitle={doc.title}
            snapshot={doc.signatureSnapshot}
            canAdjustPlacement={isLocked}
            onSnapshotUpdated={(signatureSnapshot) => {
                setDoc((prev) => (prev ? { ...prev, signatureSnapshot } : prev));
            }}
        />
    ) : null;

    return (
        <div style={{ maxWidth: isPaperDocument ? 1060 : 1180, margin: '0 auto' }}>
            {/* Editor header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                {/* Back */}
                <button onClick={() => router.push('/documents')} className="btn-icon" style={{ flexShrink: 0 }}>←</button>

                {/* Title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {editingTitle ? (
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } if (e.key === 'Escape') { setEditingTitle(false); setTitle(doc.title); } }}
                            autoFocus
                            className="input-glass"
                            style={{ fontSize: 20, fontWeight: 700, padding: '4px 10px', height: 40 }}
                        />
                    ) : (
                        <button
                            onClick={() => !isReadOnly && setEditingTitle(true)}
                            style={{ background: 'none', border: 'none', padding: '4px 0', cursor: isReadOnly ? 'default' : 'text', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'left', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                            {doc.title}
                        </button>
                    )}
                </div>

                {/* Status and save indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className={`badge badge-${doc.status.toLowerCase()}`}>{doc.status}</span>

                    {doc.status === 'DRAFT' && (
                        <span style={{ fontSize: 11, color: saveStatus === 'saved' ? 'var(--color-success)' : saveStatus === 'error' ? 'var(--color-error)' : saveStatus === 'saving' ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                            {saveStatus === 'saving' ? '⏳ Saving…' : saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? '✗ Save failed' : 'Auto-saving every 30s'}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {!isLocked && (
                        <button onClick={handleFinalise} className="btn-primary" style={{ fontSize: 12 }}>
                            {isFinalised ? '✍️ Sign Document' : '🔒 Finalise & Sign'}
                        </button>
                    )}
                    {isLocked && (
                        <button onClick={() => setShowSigning(true)} className="btn-ghost" style={{ fontSize: 12 }}>
                            📋 View Signature
                        </button>
                    )}
                </div>
            </div>

            {/* Status banner for non-draft */}
            {isReadOnly && (
                <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 'var(--radius-md)', background: isLocked ? 'var(--color-success-subtle)' : 'rgba(217,119,6,0.08)', border: `1px solid ${isLocked ? 'var(--color-success-border)' : 'rgba(217,119,6,0.28)'}`, fontSize: 13, color: isLocked ? 'var(--color-success)' : 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isLocked ? '🔐' : '⚠️'}
                    {isLocked ? 'This document is permanently locked. It has been signed and cannot be modified.' : 'This document is finalised. Its content is frozen. Sign it to lock it permanently.'}
                </div>
            )}

            <div className={isPaperDocument ? 'document-workspace-stage' : undefined}>
                {/* Editor */}
                {doc.type === 'RICH_TEXT' ? (
                    <RichTextEditor
                        key={doc.id}
                        initialContent={doc.content}
                        onContentChange={isReadOnly ? undefined : handleContentChange}
                        readOnly={isReadOnly}
                        paperMode
                        paperTitle={doc.title}
                        paperStatus={doc.status}
                        pageNumber={1}
                        afterContent={signatureStrip}
                    />
                ) : (
                    <SpreadsheetEditor
                        key={doc.id}
                        initialContent={doc.content}
                        onContentChange={isReadOnly ? undefined : handleContentChange}
                        readOnly={isReadOnly}
                    />
                )}

                {isLocked && !isPaperDocument && (
                    <DocumentPaperSheet
                        eyebrow="Digital signature"
                        title="Signed verification strip"
                        meta={<span className="document-paper-sheet__page-tag">Page 2</span>}
                        footer={(
                            <div className="document-paper-sheet__footer-bar">
                                <span>{doc.title}</span>
                                <span>Signature appendix</span>
                            </div>
                        )}
                    >
                        {signatureStrip}
                    </DocumentPaperSheet>
                )}
            </div>

            {/* Signing modal */}
            {showSigning && doc.contentHash && (
                <SigningModal
                    document={doc}
                    onClose={() => setShowSigning(false)}
                    onLocked={(updated) => {
                        setDoc(prev => prev ? { ...prev, ...updated, status: 'LOCKED' } : prev);
                        setShowSigning(false);
                        toast.success('Document signed and permanently locked!');
                    }}
                />
            )}
        </div>
    );
}
