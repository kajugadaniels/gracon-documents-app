/**
 * EditDocumentPage
 *
 * Google Docs-style document editor page. Renders a full-width sticky
 * DocEditorHeader (menu bar + toolbar) and a scrollable A4 paper canvas below.
 * All autosave, title-edit, finalise, and PDF-export logic is unchanged.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Editor } from '@tiptap/react';
import { toast } from '@/components/ui';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { DocEditorHeader } from '@/components/editor/DocEditorHeader';
import { DocumentCommentsPanel } from '@/components/editor/DocumentCommentsPanel';
import { DocumentSigningProgressPanel } from '@/components/editor/DocumentSigningProgressPanel';
import { DocumentPageGuides } from '@/components/editor/DocumentPageGuides';
import { mergeDocumentShareState } from '@/components/editor/document-share-state';
import {
    publishDocumentShareSync,
    useDocumentShareSync,
} from '@/components/editor/document-share-sync';
import { focusCommentAnchor } from '@/components/editor/comment-anchor-extension';
import { useDigitalCertificateStatus } from '@/components/editor/use-digital-certificate-status';
import { useDocumentPagination } from '@/components/editor/use-document-pagination';
import { SigningModal } from '@/components/documents/SigningModal';
import { DocumentSignatureBlock } from '@/components/documents/DocumentSignatureBlock';
import { getDigitalCertificateUrl } from '@/lib/session';
import { useSessionUser } from '@/app/(protected)/layout';
import {
    getDocument, autosaveDocument, updateDocumentMeta, finaliseDocument,
    listDocumentComments,
    type CollaboratorPermission, type DocumentComment, type DocumentDetail,
} from '@/api/documents.api';

const AUTOSAVE_INTERVAL_MS = 30_000;

function getErrorMessage(error: unknown, fallback: string) {
    const message = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
}

function hasDocumentPermission(doc: DocumentDetail | null, permission: CollaboratorPermission) {
    if (!doc) return false;
    if (!doc.access) return true;
    if (doc.access?.isOwner) return true;
    return doc.access?.permissions.includes(permission) ?? false;
}

export default function EditDocumentPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const user = useSessionUser();

    const [doc, setDoc] = useState<DocumentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [editingTitle, setEditingTitle] = useState(false);
    const [title, setTitle] = useState('');
    const [showSigning, setShowSigning] = useState(false);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [comments, setComments] = useState<DocumentComment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsError, setCommentsError] = useState<string | null>(null);
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
    const [retryKey, setRetryKey] = useState(0);
    const [shareActivityRefreshKey, setShareActivityRefreshKey] = useState(0);
    const [editor, setEditor] = useState<Editor | null>(null);
    const pagination = useDocumentPagination(editor);
    const signatureRequests = doc?.signatureRequests ?? [];
    const currentSignatureRequest = signatureRequests.find(
        request => request.requestedUserId === user?.userId,
    ) ?? null;
    const hasSignedCurrentRequest = currentSignatureRequest?.status === 'SIGNED';
    const canUseSigningAction = !!doc
        && doc.status !== 'LOCKED'
        && !hasSignedCurrentRequest
        && (
            (doc.access?.isOwner ?? true)
            || (doc.status === 'FINALISED' && hasDocumentPermission(doc, 'SIGN'))
        );
    const certificateStatus = useDigitalCertificateStatus(canUseSigningAction);

    const contentRef = useRef<Record<string, unknown> | null>(null);
    const wordCntRef = useRef(0);
    const dirtyRef = useRef(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const refreshSharedDocumentState = useCallback(async () => {
        try {
            const sharedState = await getDocument(id, false);
            setDoc((current) =>
                current ? mergeDocumentShareState(current, sharedState) : sharedState,
            );
            setShareActivityRefreshKey((current) => current + 1);
        } catch (error: unknown) {
            const status = (error as { response?: { status?: number } }).response?.status;

            if (status === 403 || status === 404) {
                toast.error('Your access to this document changed. Redirecting to documents.');
                router.replace('/documents');
            }
        }
    }, [id, router]);
    const handleShareActivityRecorded = useCallback(
        () => {
            setShareActivityRefreshKey((current) => current + 1);
            publishDocumentShareSync(id);
        },
        [id],
    );
    const handleRemoteShareSync = useCallback(() => {
        void refreshSharedDocumentState();
    }, [refreshSharedDocumentState]);

    useDocumentShareSync(id, handleRemoteShareSync);

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
                const message = getErrorMessage(error, 'Failed to load document.');
                setLoadError(message);
                toast.error(message);
            })
            .finally(() => { if (!ignore) setLoading(false); });
        return () => { ignore = true; };
    }, [id, retryKey]);

    const loadComments = useCallback(async () => {
        setCommentsLoading(true);
        setCommentsError(null);
        try {
            const response = await listDocumentComments(id);
            setComments(response.comments);
        } catch (error: unknown) {
            setCommentsError(getErrorMessage(error, 'Unable to load comments.'));
        } finally {
            setCommentsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (!doc?.id) return;
        void loadComments();
    }, [doc?.id, loadComments]);

    const commentAnchors = useMemo(
        () => comments.map((comment) => ({
            id: comment.id,
            anchorText: comment.anchorText,
            anchorFrom: comment.anchorFrom,
            anchorTo: comment.anchorTo,
            resolvedAt: comment.resolvedAt,
            active: activeCommentId === comment.id,
        })),
        [activeCommentId, comments],
    );

    // Autosave logic
    const save = useCallback(async (force = false) => {
        if (!dirtyRef.current && !force) return;
        if (!contentRef.current) return;
        if (doc?.status !== 'DRAFT') return;
        if (!hasDocumentPermission(doc, 'EDIT')) return;
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
    }, [id, doc]);

    useEffect(() => {
        const interval = setInterval(() => { void save(); }, AUTOSAVE_INTERVAL_MS);
        return () => { clearInterval(interval); void save(); };
    }, [save]);

    const handleContentChange = useCallback((content: Record<string, unknown>, wordCount: number) => {
        contentRef.current = content;
        wordCntRef.current = wordCount;
        dirtyRef.current = true;
        setSaveStatus('idle');
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => { void save(); }, 3000);
    }, [save]);

    async function handleTitleSave() {
        setEditingTitle(false);
        if (title.trim() === doc?.title) return;
        if (!hasDocumentPermission(doc, 'EDIT')) {
            setTitle(doc?.title ?? title);
            toast.warning('You do not have permission to rename this document.');
            return;
        }
        try {
            const updated = await updateDocumentMeta(id, { title: title.trim() || 'Untitled' });
            setDoc(prev => prev ? { ...prev, title: updated.title } : prev);
            setTitle(updated.title);
        } catch { toast.error('Failed to update title.'); }
    }

    async function handleFinalise() {
        if (!doc) return;

        const isOwner = doc.access?.isOwner ?? true;
        const canSign = hasDocumentPermission(doc, 'SIGN');

        if (doc.status === 'FINALISED') {
            if (hasSignedCurrentRequest) {
                toast.info('Your signature is already recorded for this document.');
                return;
            }

            if (!isOwner && !canSign) {
                toast.warning('You do not have signing access to this document.');
                return;
            }

            setShowSigning(true);
            return;
        }

        if (!isOwner) {
            toast.warning('Only the document owner can finalise and sign this document.');
            return;
        }

        if (doc.status !== 'DRAFT') return;

        await save(true);
        try {
            const finalised = await finaliseDocument(id);
            setDoc(prev => prev ? { ...prev, ...finalised, status: 'FINALISED', contentHash: finalised.contentHash } : prev);
            toast.success('Document finalised. Required signatures can now be collected.');
            setShowSigning(true);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to finalise document.';
            toast.error(msg);
        }
    }

    function handleApplyForDigitalSignature() {
        window.location.href = getDigitalCertificateUrl();
    }

    // ── Loading state ────────────────────────────────────────────────────────
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
                <p style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Unable to open this document
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {loadError ?? 'The editor could not load the requested document.'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => setRetryKey(v => v + 1)} className="btn-primary" style={{ fontSize: 12 }}>Retry</button>
                    <button onClick={() => router.push('/documents')} className="btn-ghost" style={{ fontSize: 12 }}>Back to documents</button>
                </div>
            </div>
        );
    }

    if (doc.type !== 'RICH_TEXT') {
        return (
            <div className="glass" style={{ maxWidth: 760, margin: '60px auto 0', borderRadius: 'var(--radius-xl)', padding: '30px 26px', display: 'grid', gap: 16, textAlign: 'center' }}>
                <p style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Spreadsheet documents are no longer supported here
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    The documents workspace is now dedicated to rich text documents only.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => router.push('/documents')} className="btn-primary" style={{ fontSize: 12 }}>Back to documents</button>
                    <button onClick={() => router.push('/documents/new')} className="btn-ghost" style={{ fontSize: 12 }}>Create rich text document</button>
                </div>
            </div>
        );
    }

    const canEdit = hasDocumentPermission(doc, 'EDIT');
    const canComment = hasDocumentPermission(doc, 'COMMENT');
    const canSign = hasDocumentPermission(doc, 'SIGN');
    const canManageAccess = hasDocumentPermission(doc, 'MANAGE_ACCESS');
    const isOwner = doc.access?.isOwner ?? true;
    const isReadOnly = doc.status !== 'DRAFT' || !canEdit;
    const isLocked = doc.status === 'LOCKED';
    const isFinalised = doc.status === 'FINALISED';
    const pendingSignatureCount = signatureRequests.filter(
        request => request.status !== 'SIGNED',
    ).length;
    const canViewSignature = isLocked && (isOwner || canSign);
    const readOnlyBannerText = !canEdit && doc.status === 'DRAFT'
        ? 'You can view this shared document, but you do not have edit permission.'
        : isLocked
            ? 'This document is permanently locked. It has been signed and cannot be modified.'
            : hasSignedCurrentRequest
                ? `Your signature is recorded. Waiting for ${pendingSignatureCount} remaining signer${pendingSignatureCount === 1 ? '' : 's'}.`
                : 'This document is finalised. Its content is frozen. Sign it to lock it permanently.';
    const readOnlyBannerClass = !canEdit && doc.status === 'DRAFT'
        ? 'readonly'
        : isLocked
            ? 'locked'
            : 'finalised';

    const signatureStrip = isLocked ? (
        <DocumentSignatureBlock
            documentId={doc.id}
            documentTitle={doc.title}
            snapshot={doc.signatureSnapshot}
            canAdjustPlacement={isLocked}
            onSnapshotUpdated={(signatureSnapshot) => {
                setDoc(prev => prev ? { ...prev, signatureSnapshot } : prev);
            }}
        />
    ) : null;

    function handleFocusComment(comment: DocumentComment) {
        setActiveCommentId(comment.id);
        const focused = focusCommentAnchor(editor, {
            id: comment.id,
            anchorText: comment.anchorText,
            anchorFrom: comment.anchorFrom,
            anchorTo: comment.anchorTo,
            resolvedAt: comment.resolvedAt,
            active: true,
        });

        if (!focused) {
            toast.info('The original text for this comment could not be found.');
        }
    }

    return (
        <div className="ded-page">
            {/* ── Sticky Google Docs-style header ── */}
            <DocEditorHeader
                editor={editor}
                doc={doc}
                shareActivityRefreshKey={shareActivityRefreshKey}
                saveStatus={saveStatus}
                editingTitle={editingTitle}
                title={title}
                onTitleChange={setTitle}
                onTitleSave={handleTitleSave}
                onTitleEditStart={() => setEditingTitle(true)}
                onTitleKeyDown={e => {
                    if (e.key === 'Enter') { e.currentTarget.blur(); }
                    if (e.key === 'Escape') { setEditingTitle(false); setTitle(doc.title); }
                }}
                isReadOnly={isReadOnly}
                isLocked={isLocked}
                isFinalised={isFinalised}
                canShare={canManageAccess}
                canComment={canComment}
                canUseSigningAction={canUseSigningAction}
                canViewSignature={canViewSignature}
                certificateStatus={certificateStatus.status}
                onOpenComments={() => setCommentsOpen(true)}
                onShareActivityRecorded={handleShareActivityRecorded}
                onApplyForDigitalSignature={handleApplyForDigitalSignature}
                onFinalise={handleFinalise}
                onViewSignature={() => setShowSigning(true)}
            />

            {/* ── Status banner (read-only) ── */}
            {isReadOnly && (
                <div className={`ded-status-banner ded-status-banner--${readOnlyBannerClass}`}>
                    {readOnlyBannerText}
                </div>
            )}

            <DocumentSigningProgressPanel
                document={doc}
                currentUserId={user?.userId ?? null}
                canManageAccess={canManageAccess}
                onOpenSigning={() => setShowSigning(true)}
                onActivityRecorded={handleShareActivityRecorded}
                onDocumentRefresh={() => setRetryKey(v => v + 1)}
            />

            {/* ── Paper canvas ── */}
            <div className="ded-canvas">
                <div className="document-workspace-stage">
                    <div className="document-layout-frame">
                        <RichTextEditor
                            key={doc.id}
                            initialContent={doc.content}
                            onContentChange={isReadOnly ? undefined : handleContentChange}
                            onEditorReady={setEditor}
                            hideToolbar
                            readOnly={isReadOnly}
                            paperMode
                            paperTitle={doc.title}
                            paperStatus={doc.status}
                            pageNumber={1}
                            pageCount={pagination.pageCount}
                            overlayContent={signatureStrip}
                            commentAnchors={commentAnchors}
                        />
                        <DocumentPageGuides pages={pagination.pages} />
                    </div>
                </div>
            </div>

            <DocumentCommentsPanel
                documentId={doc.id}
                editor={editor}
                canComment={canComment}
                canResolve={doc.access?.isOwner ?? true}
                open={commentsOpen}
                comments={comments}
                loading={commentsLoading}
                error={commentsError}
                activeCommentId={activeCommentId}
                onCommentsChange={setComments}
                onReload={loadComments}
                onFocusComment={handleFocusComment}
                onClose={() => setCommentsOpen(false)}
            />

            {/* ── Signing modal ── */}
            {showSigning && doc.contentHash && (
                <SigningModal
                    document={doc}
                    onClose={() => setShowSigning(false)}
                    onLocked={(updated) => {
                        setDoc(prev => prev ? { ...prev, ...updated } : prev);
                        setShowSigning(false);
                        if (updated.status === 'LOCKED') {
                            toast.success('Document signed and permanently locked!');
                            return;
                        }

                        toast.success(
                            `Signature recorded. Waiting for ${updated.pendingSignatureCount ?? 0} remaining signer${updated.pendingSignatureCount === 1 ? '' : 's'}.`,
                        );
                    }}
                />
            )}
        </div>
    );
}
