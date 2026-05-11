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
import { DocumentPrintPreviewDialog } from '@/components/editor/DocumentPrintPreviewDialog';
import { DocumentAccessTransitionBanner } from '@/components/editor/DocumentAccessTransitionBanner';
import { DocumentRulerOverlay, DocumentPageRulerSidebar } from '@/components/editor/DocumentRulerOverlay';
import { DocEditorHeader } from '@/components/editor/DocEditorHeader';
import { DocumentCommentsPanel } from '@/components/editor/DocumentCommentsPanel';
import { DocumentSigningProgressPanel } from '@/components/editor/DocumentSigningProgressPanel';
import { DocumentTabsPanel, type DocumentTabItem } from '@/components/editor/DocumentTabsPanel';
import { PagedDocumentCanvas } from '@/components/editor/PagedDocumentCanvas';
import { mergeDocumentShareState } from '@/components/editor/document-share-state';
import {
    publishDocumentShareSync,
    useDocumentShareSync,
} from '@/components/editor/document-share-sync';
import { focusCommentAnchor } from '@/components/editor/comment-anchor-extension';
import { useDigitalCertificateStatus } from '@/components/editor/use-digital-certificate-status';
import { useDocumentViewState } from '@/components/editor/use-document-view-state';
import { useActiveParagraphLayout } from '@/components/editor/use-active-paragraph-layout';
import { SigningModal } from '@/components/documents/SigningModal';
import { DocumentSignatureBlock } from '@/components/documents/DocumentSignatureBlock';
import { buildViewMenuItems } from '@/constants/view-menu';
import { A4_PAPER_HEIGHT_PX, A4_PAPER_WIDTH_PX } from '@/constants';
import { useStarred } from '@/lib/hooks/useStarred';
import { getDigitalCertificateUrl, redirectToLogin } from '@/lib/session';
import { buildSignatureBlockInserts, getSignatureBlockSigners } from '@/lib/editor-signature-blocks';
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
    const { isStarred, toggleStar } = useStarred();

    const [doc, setDoc] = useState<DocumentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [accessTransitionMessage, setAccessTransitionMessage] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [editingTitle, setEditingTitle] = useState(false);
    const [title, setTitle] = useState('');
    const [showFinaliseDialog, setShowFinaliseDialog] = useState(false);
    const [showPageSetupDialog, setShowPageSetupDialog] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
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
    const [leftRulerPages, setLeftRulerPages] = useState([{ pageNumber: 1, top: 0 }]);
    const [documentTabs, setDocumentTabs] = useState<DocumentTabItem[]>([]);
    const [activeDocumentTabId, setActiveDocumentTabId] = useState<string | null>(null);
    const continuousDocumentLayout = useMemo(() => ({
        pageCount: 1,
        activePage: 1,
        pageHeight: A4_PAPER_HEIGHT_PX,
        contentHeight: A4_PAPER_HEIGHT_PX,
        pages: [{ pageNumber: 1, top: 0 }],
    }), []);
    const pageRootRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
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
    const saveInFlightRef = useRef<Promise<boolean> | null>(null);
    const documentTabsMeasureFrameRef = useRef<number | null>(null);
    const documentTabsScrollFrameRef = useRef<number | null>(null);
    const updateActiveDocumentTab = useCallback(() => {
        const canvasEl = canvasRef.current;
        const editorEl = canvasEl?.querySelector<HTMLElement>('.ProseMirror');

        if (!canvasEl || !editorEl) return;

        const canvasTop = canvasEl.getBoundingClientRect().top;
        const headings = Array.from(editorEl.querySelectorAll<HTMLElement>('h1, h2, h3'));
        const currentHeading = headings.reduce<HTMLElement | null>((activeHeading, heading) => {
            const top = heading.getBoundingClientRect().top - canvasTop;

            if (top <= 42) {
                return heading;
            }

            return activeHeading;
        }, null);

        if (currentHeading?.id) {
            setActiveDocumentTabId((current) => (
                current === currentHeading.id ? current : currentHeading.id
            ));
        }
    }, []);
    const measureDocumentTabs = useCallback(() => {
        const editorEl = canvasRef.current?.querySelector<HTMLElement>('.ProseMirror');
        if (!editorEl) return;

        const editorRect = editorEl.getBoundingClientRect();
        const headings = Array.from(editorEl.querySelectorAll<HTMLElement>('h1, h2, h3'));
        const nextTabs = headings
            .map((heading, index) => {
                const label = heading.textContent?.replace(/\s+/g, ' ').trim();

                if (!label) {
                    return null;
                }

                if (!heading.id) {
                    heading.id = `document-heading-tab-${index + 1}`;
                }

                const headingRect = heading.getBoundingClientRect();
                const top = Math.max(0, headingRect.top - editorRect.top + editorEl.scrollTop);
                const level = Number.parseInt(heading.tagName.replace('H', ''), 10);

                return {
                    id: heading.id,
                    label,
                    pageNumber: Math.max(1, Math.floor(top / A4_PAPER_HEIGHT_PX) + 1),
                    level: Number.isFinite(level) ? level : 1,
                };
            })
            .filter((tab): tab is DocumentTabItem => Boolean(tab));

        setDocumentTabs((current) => {
            const unchanged = current.length === nextTabs.length
                && current.every((tab, index) => {
                    const nextTab = nextTabs[index];

                    return tab.id === nextTab.id
                        && tab.label === nextTab.label
                        && tab.pageNumber === nextTab.pageNumber
                        && tab.level === nextTab.level;
                });

            return unchanged ? current : nextTabs;
        });
        updateActiveDocumentTab();
    }, [updateActiveDocumentTab]);
    const scheduleDocumentTabsMeasure = useCallback(() => {
        if (documentTabsMeasureFrameRef.current !== null) {
            return;
        }

        documentTabsMeasureFrameRef.current = window.requestAnimationFrame(() => {
            documentTabsMeasureFrameRef.current = null;
            measureDocumentTabs();
        });
    }, [measureDocumentTabs]);
    const scheduleActiveDocumentTabUpdate = useCallback(() => {
        if (documentTabsScrollFrameRef.current !== null) {
            return;
        }

        documentTabsScrollFrameRef.current = window.requestAnimationFrame(() => {
            documentTabsScrollFrameRef.current = null;
            updateActiveDocumentTab();
        });
    }, [updateActiveDocumentTab]);
    const measureLeftRulerPages = useCallback(() => {
        const editorEl = canvasRef.current?.querySelector<HTMLElement>('.ProseMirror');
        if (!editorEl) return;

        const contentHeight = Math.max(A4_PAPER_HEIGHT_PX, editorEl.scrollHeight);
        const pageCount = Math.max(1, Math.ceil(contentHeight / A4_PAPER_HEIGHT_PX));

        setLeftRulerPages((current) => {
            if (current.length === pageCount) {
                return current;
            }

            return Array.from({ length: pageCount }, (_, index) => ({
                pageNumber: index + 1,
                top: index * A4_PAPER_HEIGHT_PX,
            }));
        });
        scheduleDocumentTabsMeasure();
    }, [scheduleDocumentTabsMeasure]);
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

    useEffect(() => {
        const editorEl = canvasRef.current?.querySelector<HTMLElement>('.ProseMirror');
        const canvasEl = canvasRef.current;
        if (!editorEl) return;

        const animationFrame = window.requestAnimationFrame(measureLeftRulerPages);
        const resizeObserver = new ResizeObserver(measureLeftRulerPages);
        const mutationObserver = new MutationObserver(scheduleDocumentTabsMeasure);
        resizeObserver.observe(editorEl);
        mutationObserver.observe(editorEl, {
            childList: true,
            characterData: true,
            subtree: true,
        });
        canvasEl?.addEventListener('scroll', scheduleActiveDocumentTabUpdate, { passive: true });
        window.addEventListener('resize', measureLeftRulerPages);

        return () => {
            window.cancelAnimationFrame(animationFrame);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            canvasEl?.removeEventListener('scroll', scheduleActiveDocumentTabUpdate);
            window.removeEventListener('resize', measureLeftRulerPages);
        };
    }, [
        doc?.id,
        editor,
        measureLeftRulerPages,
        scheduleActiveDocumentTabUpdate,
        scheduleDocumentTabsMeasure,
    ]);

    useEffect(() => () => {
        if (documentTabsMeasureFrameRef.current !== null) {
            window.cancelAnimationFrame(documentTabsMeasureFrameRef.current);
        }

        if (documentTabsScrollFrameRef.current !== null) {
            window.cancelAnimationFrame(documentTabsScrollFrameRef.current);
        }
    }, []);

    // Load document
    useEffect(() => {
        let ignore = false;
        setLoading(true);
        setLoadError(null);
        setDocumentTabs([]);
        setActiveDocumentTabId(null);
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
        if (saveInFlightRef.current) {
            if (!force) return false;
            await saveInFlightRef.current;
        }

        if (!dirtyRef.current && !force) return false;
        if (!contentRef.current) return false;
        if (doc?.status !== 'DRAFT') return false;
        if (!hasDocumentPermission(doc, 'EDIT')) return false;

        const content = contentRef.current;
        const wordCount = wordCntRef.current;
        setSaveStatus('saving');
        dirtyRef.current = false;

        const operation = (async () => {
            try {
                for (let attempt = 0; attempt < 2; attempt += 1) {
                    try {
                        await autosaveDocument(id, content, wordCount);
                        setSaveStatus('saved');
                        setTimeout(() => setSaveStatus('idle'), 2000);
                        return true;
                    } catch (err: unknown) {
                        const httpStatus = (err as { response?: { status?: number } })?.response?.status;

                        if (httpStatus === 409 && attempt === 0) {
                            await new Promise(resolve => setTimeout(resolve, 250));
                            continue;
                        }

                        if (httpStatus === 401) {
                            // The token refresh interceptor already attempted a silent refresh.
                            // Reaching here means the session is definitively expired — either
                            // the refresh was rejected as unauthenticated, or the refresh service
                            // was unreachable. Do not mark as dirty so autosave stops retrying,
                            // then redirect the user so they can log in again without losing context.
                            dirtyRef.current = false;
                            toast.error('Your session has expired. Redirecting to login…');
                            redirectToLogin(
                                `${window.location.pathname}${window.location.search}${window.location.hash}`,
                            );
                            return false;
                        }

                        setSaveStatus('error');
                        dirtyRef.current = true;
                        return false;
                    }
                }

                return false;
            } finally {
                saveInFlightRef.current = null;
            }
        })();

        saveInFlightRef.current = operation;
        return operation;
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
        window.requestAnimationFrame(() => {
            measureLeftRulerPages();
            scheduleDocumentTabsMeasure();
        });
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => { void save(); }, 3000);
    }, [measureLeftRulerPages, save, scheduleDocumentTabsMeasure]);

    const handleManualSave = useCallback(async () => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }

        const saved = await save(true);

        if (saved) {
            toast.success('Document saved.');
        } else if (doc?.status !== 'DRAFT') {
            toast.info('Only draft documents can be saved manually.');
        } else if (!hasDocumentPermission(doc, 'EDIT')) {
            toast.warning('You do not have permission to save this document.');
        } else {
            toast.error('Document could not be saved. Your changes remain queued.');
        }
    }, [doc, save]);
    const handleSelectDocumentTab = useCallback((tab: DocumentTabItem) => {
        const canvasEl = canvasRef.current;
        const editorEl = canvasEl?.querySelector<HTMLElement>('.ProseMirror');
        if (!canvasEl || !editorEl) return;

        const safeId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(tab.id)
            : tab.id.replace(/"/g, '\\"');
        const heading = editorEl.querySelector<HTMLElement>(`#${safeId}`);
        if (!heading) return;

        setActiveDocumentTabId(tab.id);

        const canvasRect = canvasEl.getBoundingClientRect();
        const headingRect = heading.getBoundingClientRect();
        const targetScrollTop = canvasEl.scrollTop + headingRect.top - canvasRect.top - 24;

        canvasEl.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth',
        });
        editor?.commands.focus();
    }, [editor]);

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

        if (actionId === 'view:print-preview') {
            setShowPrintPreview(true);
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
    const signatureBlockSigners = useMemo(
        () => getSignatureBlockSigners(doc, user),
        [doc, user],
    );
    const signatureBlockEvidence = useMemo(
        () => buildSignatureBlockInserts(signatureBlockSigners, doc.completedSignatures),
        [doc.completedSignatures, signatureBlockSigners],
    );
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

    useEffect(() => {
        if (!editor || signatureBlockEvidence.length === 0) {
            return;
        }

        editor.commands.updateSignatureBlockEvidence(signatureBlockEvidence);
    }, [editor, signatureBlockEvidence]);

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
                canPrepareSignatureBlocks={isOwner && doc.status === 'DRAFT'}
                signatureBlockSigners={signatureBlockSigners}
                viewMenuItems={viewMenuItems}
                certificateStatus={certificateStatus.status}
                isStarred={isStarred(doc.id)}
                onOpenComments={() => setCommentsOpen(true)}
                onToggleStar={() => toggleStar(doc.id)}
                onManualSave={handleManualSave}
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

            {showPrintPreview && (
                <DocumentPrintPreviewDialog
                    documentId={doc.id}
                    title={title.trim() || doc.title}
                    status={doc.status}
                    content={contentRef.current ?? doc.content}
                    layout={documentLayout}
                    pageCount={continuousDocumentLayout.pageCount}
                    pageHeight={continuousDocumentLayout.pageHeight}
                    contentHeight={continuousDocumentLayout.contentHeight}
                    onClose={() => setShowPrintPreview(false)}
                />
            )}

            {/* ── Sticky horizontal ruler (Google Docs-style — stays below the header) ── */}
            {viewState.showRuler && (
                <DocumentRulerOverlay
                    rulerMode="top-only"
                    width={A4_PAPER_WIDTH_PX}
                    height={continuousDocumentLayout.pageHeight}
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

            {/* ── Page body: fixed ruler sidebar + scrollable document canvas ── */}
            <div className="ded-page-body">
                <DocumentTabsPanel
                    tabs={documentTabs}
                    activeTabId={activeDocumentTabId}
                    onSelectTab={handleSelectDocumentTab}
                />

                {/* Vertical ruler sidebar — scroll is driven by canvas, not the user */}
                {viewState.showRuler && (
                    <div className="ded-ruler-sidebar">
                        <DocumentPageRulerSidebar
                            canvasRef={canvasRef}
                            pages={leftRulerPages}
                            pageHeight={continuousDocumentLayout.pageHeight}
                            zoomScale={zoomScale}
                            margins={documentLayout.margins}
                            disabled={baseIsReadOnly}
                        />
                    </div>
                )}

            {/* ── Paper canvas ── */}
            <PagedDocumentCanvas
                canvasRef={canvasRef}
                documentId={doc.id}
                title={doc.title}
                status={doc.status}
                content={doc.content}
                isReadOnly={isReadOnly}
                zoomScale={zoomScale}
                pageCount={continuousDocumentLayout.pageCount}
                pageHeight={continuousDocumentLayout.pageHeight}
                contentHeight={continuousDocumentLayout.contentHeight}
                printLayout={viewState.printLayout}
                showFormattingMarks={viewState.showFormattingMarks}
                paperStyle={documentLayoutStyle}
                headerFooter={documentLayout.headerFooter}
                overlayContent={signatureStrip}
                commentAnchors={commentAnchors}
                onContentChange={handleContentChange}
                onEditorReady={setEditor}
            />
            </div>{/* /.ded-page-body */}

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
