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
import { DocumentFinaliseDialog } from '@/components/editor/DocumentFinaliseDialog';
import { DocumentPageSetupDialog } from '@/components/editor/DocumentPageSetupDialog';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { DocumentAccessTransitionBanner } from '@/components/editor/DocumentAccessTransitionBanner';
import { DocumentRulerOverlay, DocumentPageRulers } from '@/components/editor/DocumentRulerOverlay';
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
import { useDocumentViewState } from '@/components/editor/use-document-view-state';
import { useActiveParagraphLayout } from '@/components/editor/use-active-paragraph-layout';
import { SigningModal } from '@/components/documents/SigningModal';
import { DocumentSignatureBlock } from '@/components/documents/DocumentSignatureBlock';
import { buildViewMenuItems } from '@/constants/view-menu';
import { A4_PAPER_WIDTH_PX } from '@/constants';
import { getDigitalCertificateUrl } from '@/lib/session';
import {
    buildDocumentLayoutStyle,
    clampHorizontalDocumentMargins,
    normalizeDocumentLayout,
    type DocumentLayout,
    type ParagraphIndentation,
    type ParagraphTabStop,
} from '@/lib/document-layout';
import { useSessionUser } from '@/app/(protected)/layout';
import {
    getDocument, autosaveDocument, updateDocumentMeta, finaliseDocument, lockDocument,
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
    const [accessTransitionMessage, setAccessTransitionMessage] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [editingTitle, setEditingTitle] = useState(false);
    const [title, setTitle] = useState('');
    const [showFinaliseDialog, setShowFinaliseDialog] = useState(false);
    const [showPageSetupDialog, setShowPageSetupDialog] = useState(false);
    const [savingPageSetup, setSavingPageSetup] = useState(false);
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
    const pageRootRef = useRef<HTMLDivElement>(null);
    const signatureRequests = doc?.signatureRequests ?? [];
    const currentSignatureRequest = signatureRequests.find(
        request => request.requestedUserId === user?.userId,
    ) ?? null;
    const hasSignedCurrentRequest = currentSignatureRequest?.status === 'SIGNED';
    const canFinaliseDocument = !!doc
        && doc.status === 'DRAFT'
        && (doc.access?.isOwner ?? true);
    const canLockDocument = !!doc
        && doc.status === 'SIGNED'
        && (doc.access?.isOwner ?? true);
    const canSignDocument = !!doc
        && doc.status === 'FINALISED'
        && Boolean(currentSignatureRequest)
        && !hasSignedCurrentRequest;
    const certificateStatus = useDigitalCertificateStatus(canSignDocument);

    const contentRef = useRef<Record<string, unknown> | null>(null);
    const wordCntRef = useRef(0);
    const dirtyRef = useRef(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rulerCommitLayoutRef = useRef<DocumentLayout | null>(null);
    const beginAccessTransition = useCallback((message: string) => {
        setAccessTransitionMessage((current) => current ?? message);

        if (redirectTimerRef.current) {
            return;
        }

        redirectTimerRef.current = setTimeout(() => {
            router.replace('/documents');
        }, 1400);
    }, [router]);
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
                beginAccessTransition(
                    'Your access to this document changed. Redirecting to documents…',
                );
            }
        }
    }, [beginAccessTransition, id]);
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

    useEffect(() => () => {
        if (redirectTimerRef.current) {
            clearTimeout(redirectTimerRef.current);
        }
    }, []);

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

    async function submitFinalise(options: { requireOwnerSignature: boolean }) {
        if (!doc) return;

        const isOwner = doc.access?.isOwner ?? true;

        if (!isOwner) {
            toast.warning('Only the document owner can finalise and sign this document.');
            return;
        }

        if (doc.status !== 'DRAFT') return;

        await save(true);
        try {
            const finalised = await finaliseDocument(id, {
                requireOwnerSignature: options.requireOwnerSignature,
            });
            setDoc(prev => prev ? { ...prev, ...finalised, status: 'FINALISED', contentHash: finalised.contentHash } : prev);
            setShowFinaliseDialog(false);
            toast.success('Document finalised. Required signatures can now be collected.');
            if (finalised.signatureRequests.some(request => request.requestedUserId === user?.userId)) {
                setShowSigning(true);
            }
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to finalise document.';
            toast.error(msg);
        }
    }

    function handleFinalise() {
        if (canFinaliseDocument) {
            setShowFinaliseDialog(true);
        }
    }

    function handleSignDocument() {
        if (!doc) return;
        if (hasSignedCurrentRequest) {
            toast.info('Your signature is already recorded for this document.');
            return;
        }
        if (!currentSignatureRequest) {
            toast.warning('You are not currently listed as a required signer for this document.');
            return;
        }

        setShowSigning(true);
    }

    async function handleLockDocument() {
        if (!doc || !canLockDocument) {
            return;
        }

        const shouldLock = window.confirm(
            'Lock this document now? After locking, the document becomes permanently immutable.',
        );

        if (!shouldLock) {
            return;
        }

        try {
            const locked = await lockDocument(id);
            setDoc(prev => prev ? { ...prev, ...locked, status: 'LOCKED' } : prev);
            toast.success('Document locked. It is now permanently immutable.');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to lock document.'));
        }
    }

    function handleApplyForDigitalSignature() {
        window.location.href = getDigitalCertificateUrl();
    }

    const canEdit = hasDocumentPermission(doc, 'EDIT');
    const baseIsReadOnly = doc?.status !== 'DRAFT' || !canEdit;
    const { viewState, handleViewAction } = useDocumentViewState({
        canToggleMode: !baseIsReadOnly,
        fullscreenTargetRef: pageRootRef,
    });
    const viewMenuItems = useMemo(() => buildViewMenuItems({
        printLayout: viewState.printLayout,
        canToggleMode: !baseIsReadOnly,
        canConfigureLayout: !baseIsReadOnly,
        viewMode: viewState.viewMode,
        zoom: viewState.zoom,
        isFullscreen: viewState.isFullscreen,
        showRuler: viewState.showRuler,
        showFormattingMarks: viewState.showFormattingMarks,
    }), [baseIsReadOnly, viewState]);
    const handleHeaderViewAction = useCallback((actionId: string) => {
        if (actionId === 'view:page-setup') {
            if (baseIsReadOnly) {
                toast.warning('Page setup can only be changed while the document is still editable.');
                return;
            }

            setShowPageSetupDialog(true);
            return;
        }

        handleViewAction(actionId);
    }, [baseIsReadOnly, handleViewAction]);
    const documentLayout = useMemo(
        () => normalizeDocumentLayout(doc?.layout),
        [doc?.layout],
    );
    const documentLayoutStyle = useMemo(
        () => buildDocumentLayoutStyle(documentLayout),
        [documentLayout],
    );
    const activeParagraphLayout = useActiveParagraphLayout(editor);
    const applyParagraphIndentation = useCallback((indentation: ParagraphIndentation) => {
        if (!editor || baseIsReadOnly || !activeParagraphLayout) {
            return;
        }

        editor.commands.setParagraphIndentation({
            leftIndent: indentation.leftIndent,
            firstLineIndent: indentation.firstLineIndent,
        });
    }, [activeParagraphLayout, baseIsReadOnly, editor]);
    const applyParagraphTabStops = useCallback((tabStops: ParagraphTabStop[]) => {
        if (!editor || baseIsReadOnly || !activeParagraphLayout) {
            return;
        }

        editor.commands.setParagraphTabStops(tabStops);
    }, [activeParagraphLayout, baseIsReadOnly, editor]);
    const applyHorizontalMarginsPreview = useCallback(
        (nextMargins: { left: number; right: number }) => {
            setDoc((current) => {
                if (!current) return current;

                const nextHorizontalMargins = clampHorizontalDocumentMargins(
                    A4_PAPER_WIDTH_PX,
                    nextMargins,
                );

                return {
                    ...current,
                    layout: {
                        ...normalizeDocumentLayout(current.layout),
                        margins: {
                            ...normalizeDocumentLayout(current.layout).margins,
                            ...nextHorizontalMargins,
                        },
                    },
                };
            });
        },
        [],
    );
    const commitHorizontalMargins = useCallback(
        async (nextMargins: { left: number; right: number }) => {
            const baselineLayout = rulerCommitLayoutRef.current;
            const currentLayout = doc ? normalizeDocumentLayout(doc.layout) : null;
            const sourceLayout = baselineLayout ?? currentLayout;

            if (!doc || baseIsReadOnly || !sourceLayout) {
                return;
            }

            const nextHorizontalMargins = clampHorizontalDocumentMargins(
                A4_PAPER_WIDTH_PX,
                nextMargins,
            );
            const nextLayout: DocumentLayout = {
                ...sourceLayout,
                margins: {
                    ...sourceLayout.margins,
                    ...nextHorizontalMargins,
                },
            };

            rulerCommitLayoutRef.current = null;

            if (
                nextLayout.margins.left === sourceLayout.margins.left &&
                nextLayout.margins.right === sourceLayout.margins.right
            ) {
                return;
            }

            try {
                const updated = await updateDocumentMeta(id, { layout: nextLayout });
                setDoc((current) => (
                    current
                        ? {
                            ...current,
                            layout: updated.layout,
                            updatedAt: updated.updatedAt,
                        }
                        : current
                ));
                toast.success('Margins updated.');
            } catch (error: unknown) {
                setDoc((current) => (
                    current
                        ? {
                            ...current,
                            layout: sourceLayout,
                        }
                        : current
                ));
                toast.error(getErrorMessage(error, 'Failed to update ruler margins.'));
            }
        },
        [baseIsReadOnly, doc, id],
    );

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

    const canComment = hasDocumentPermission(doc, 'COMMENT');
    const canSign = hasDocumentPermission(doc, 'SIGN');
    const canManageAccess = hasDocumentPermission(doc, 'MANAGE_ACCESS');
    const isOwner = doc.access?.isOwner ?? true;
    const isViewingMode = !baseIsReadOnly && viewState.viewMode === 'viewing';
    const isReadOnly = baseIsReadOnly || isViewingMode;
    const isLocked = doc.status === 'LOCKED';
    const pendingSignatureCount = signatureRequests.filter(
        request => request.status !== 'SIGNED',
    ).length;
    const canViewSignature = isLocked && (isOwner || canSign);
    const acceptedSignerCount = doc.collaborators.filter((collaborator) =>
        collaborator.isActive &&
        collaborator.invitationStatus === 'ACCEPTED' &&
        collaborator.permissions.includes('SIGN'),
    ).length;
    const remainingSignerLabel = `${pendingSignatureCount} remaining signer${pendingSignatureCount === 1 ? '' : 's'}`;
    const readOnlyBannerText = isViewingMode
        ? 'Viewing mode is on. Switch back to editing from View when you want to make changes.'
        : !canEdit && doc.status === 'DRAFT'
        ? 'You can view this shared document, but you do not have edit permission.'
        : isLocked
            ? 'This document is permanently locked. It has been signed and cannot be modified.'
            : canLockDocument
                ? 'All required signatures are complete. Lock this document when you are ready.'
            : hasSignedCurrentRequest
                ? `Your signature is recorded. Waiting for ${remainingSignerLabel}.`
                : canSignDocument
                    ? 'This document is finalised. Its content is frozen. Sign when you are ready.'
                    : doc.status === 'SIGNED'
                        ? 'All required signatures are complete. Waiting for the owner to lock this document.'
                        : `This document is finalised. Its content is frozen. Waiting for ${remainingSignerLabel}.`;
    const readOnlyBannerClass = isViewingMode
        ? 'readonly'
        : !canEdit && doc.status === 'DRAFT'
        ? 'readonly'
        : isLocked
            ? 'locked'
            : 'finalised';
    const zoomScale = viewState.zoom / 100;
    const scaledFrameWidth = Math.round(A4_PAPER_WIDTH_PX * zoomScale);
    const scaledFrameHeight = Math.max(pagination.contentHeight, pagination.pageHeight) * zoomScale;

    async function handleSavePageSetup(nextLayout: DocumentLayout) {
        if (!doc || baseIsReadOnly) {
            return;
        }

        setSavingPageSetup(true);
        try {
            const updated = await updateDocumentMeta(id, { layout: nextLayout });
            setDoc((current) => (
                current
                    ? {
                        ...current,
                        layout: updated.layout,
                        updatedAt: updated.updatedAt,
                      }
                    : current
            ));
            setShowPageSetupDialog(false);
            toast.success('Page setup updated.');
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to update page setup.'));
        } finally {
            setSavingPageSetup(false);
        }
    }

    const signatureStrip = isLocked ? (
        <DocumentSignatureBlock
            documentId={doc.id}
            documentTitle={doc.title}
            snapshot={doc.signatureSnapshot}
            completedSignatures={doc.completedSignatures}
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
        <div
            ref={pageRootRef}
            className={`ded-page${accessTransitionMessage ? ' ded-page--access-transition' : ''}`}
        >
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
                canShare={canManageAccess}
                canComment={canComment}
                canFinalise={canFinaliseDocument}
                canLock={canLockDocument}
                canSign={canSignDocument}
                canViewSignature={canViewSignature}
                viewMenuItems={viewMenuItems}
                certificateStatus={certificateStatus.status}
                onOpenComments={() => setCommentsOpen(true)}
                onShareActivityRecorded={handleShareActivityRecorded}
                onApplyForDigitalSignature={handleApplyForDigitalSignature}
                onFinalise={handleFinalise}
                onLock={handleLockDocument}
                onSign={handleSignDocument}
                onViewSignature={() => setShowSigning(true)}
                onViewAction={handleHeaderViewAction}
            />

            {/* ── Status banner (read-only) ── */}
            {isReadOnly && (
                <div className={`ded-status-banner ded-status-banner--${readOnlyBannerClass}`}>
                    {readOnlyBannerText}
                </div>
            )}

            {accessTransitionMessage && (
                <DocumentAccessTransitionBanner message={accessTransitionMessage} />
            )}

            <DocumentSigningProgressPanel
                document={doc}
                currentUserId={user?.userId ?? null}
                canManageAccess={canManageAccess}
                onOpenSigning={() => setShowSigning(true)}
                onActivityRecorded={handleShareActivityRecorded}
                onDocumentRefresh={() => setRetryKey(v => v + 1)}
            />

            <DocumentFinaliseDialog
                acceptedSignerCount={acceptedSignerCount}
                open={showFinaliseDialog}
                onClose={() => setShowFinaliseDialog(false)}
                onConfirm={submitFinalise}
            />

            {showPageSetupDialog && (
                <DocumentPageSetupDialog
                    layout={documentLayout}
                    saving={savingPageSetup}
                    onClose={() => setShowPageSetupDialog(false)}
                    onSave={handleSavePageSetup}
                />
            )}

            {/* ── Sticky horizontal ruler (Google Docs-style — stays below the header) ── */}
            {viewState.showRuler && (
                <DocumentRulerOverlay
                    rulerMode="top-only"
                    width={A4_PAPER_WIDTH_PX}
                    height={pagination.pageHeight}
                    margins={documentLayout.margins}
                    paragraphIndent={activeParagraphLayout}
                    disabled={baseIsReadOnly}
                    onHorizontalMarginsPreview={(nextMargins) => {
                        if (!rulerCommitLayoutRef.current) {
                            rulerCommitLayoutRef.current = documentLayout;
                        }
                        applyHorizontalMarginsPreview(nextMargins);
                    }}
                    onHorizontalMarginsCommit={commitHorizontalMargins}
                    onParagraphIndentPreview={applyParagraphIndentation}
                    onParagraphIndentCommit={applyParagraphIndentation}
                    onParagraphTabStopsChange={applyParagraphTabStops}
                />
            )}

            {/* ── Paper canvas ── */}
            <div className="ded-canvas">
                <div className="document-workspace-stage">
                    <div
                        className="document-layout-shell"
                        style={{ width: scaledFrameWidth, minHeight: scaledFrameHeight }}
                    >
                        <div
                            className={[
                                'document-layout-frame',
                                !viewState.printLayout ? 'document-layout-frame--web-layout' : '',
                                viewState.showFormattingMarks ? 'document-layout-frame--show-marks' : '',
                            ].filter(Boolean).join(' ')}
                            style={{
                                transform: `scale(${zoomScale})`,
                                transformOrigin: 'top center',
                            }}
                        >
                            {/* One vertical ruler per page — each shows 0→11" independently */}
                            {viewState.showRuler && (
                                <DocumentPageRulers
                                    pages={pagination.pages}
                                    pageHeight={pagination.pageHeight}
                                    margins={documentLayout.margins}
                                    disabled={baseIsReadOnly}
                                />
                            )}
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
                                paperStyle={documentLayoutStyle}
                                overlayContent={signatureStrip}
                                commentAnchors={commentAnchors}
                            />
                            {viewState.printLayout && <DocumentPageGuides pages={pagination.pages} />}
                        </div>
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
                    onSigned={(updated) => {
                        setDoc(prev => prev ? { ...prev, ...updated } : prev);
                        setShowSigning(false);
                        if (updated.status === 'SIGNED') {
                            toast.success('All required signatures are complete. The owner can now lock the document.');
                            return;
                        }

                        toast.success(
                            `Signature recorded. Waiting for ${updated.pendingSignatureCount ?? 0} remaining signer${updated.pendingSignatureCount === 1 ? '' : 's'}.`,
                        );
                    }}
                />
            )}

            {accessTransitionMessage && <div className="ded-access-transition-scrim" aria-hidden="true" />}
        </div>
    );
}
