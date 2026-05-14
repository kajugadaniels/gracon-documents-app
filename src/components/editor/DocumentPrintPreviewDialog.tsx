'use client';

// Owns the modal print-preview shell while keeping experimental pagination isolated.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import dynamic from 'next/dynamic';
import { saveRenderedDocumentAs } from '@/lib/export-document';
import { savePaginatedPreviewAsPdf } from '@/lib/export-paginated-preview';
import { PAPER_PAGE_GAP_PX } from '@/constants/document-paper';
import { DEFAULT_DOCUMENT_LAYOUT, type DocumentLayout } from '@/lib/document-layout';
import { buildDocumentLayoutStyle } from '@/lib/document-layout';
import { PagedDocumentCanvas } from './PagedDocumentCanvas';
import { DocumentLoadingState } from './DocumentLoadingState';
import { PrintPreviewRendererBoundary } from './PrintPreviewRendererBoundary';
import type { CommentAnchorInput } from '@/store/editor/comment-anchor-extension';

const USE_PAGINATED_PRINT_PREVIEW = true;
const SAVE_PDF_USES_EXISTING_EXPORT_CANVAS = true;
const PAGINATED_PREVIEW_READY_TIMEOUT_MS = 8000;
const PAGINATED_EXPORT_READY_TIMEOUT_MS = 8000;
const TIPTAP_VIEW_NOT_MOUNTED_ERROR = 'The editor view is not available';
const PAGINATED_EXPORT_HOST_SELECTOR = '[data-paginated-export-host="true"]';
const PAGINATED_PRINT_PREVIEW_STYLES = `
.document-print-preview {
    background:
        radial-gradient(circle at 22% 18%, rgba(93, 58, 222, 0.24), transparent 32%),
        linear-gradient(135deg, #120d23 0%, #171224 46%, #0e1119 100%) !important;
}
.document-print-preview__body {
    background:
        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),
        linear-gradient(180deg, rgba(255,255,255,0.035) 1px, transparent 1px),
        rgba(10, 10, 18, 0.42) !important;
    background-size: 48px 48px, 48px 48px, auto !important;
}
.document-print-preview .paginated-print-preview__editor .ProseMirror,
.document-print-preview .paginated-print-preview__editor .rm-with-pagination {
    background: #ffffff !important;
    color: var(--color-text-primary) !important;
    box-shadow: var(--paper-shadow) !important;
}
.document-print-preview .paginated-print-preview__editor .rm-pages-wrapper,
.document-print-preview .paginated-print-preview__editor .rm-page-break,
.document-print-preview .paginated-print-preview__editor .page {
    background: #ffffff !important;
}
.document-print-preview .paginated-print-preview__editor .rm-pagination-gap {
    background: #e5e7eb !important;
}
.document-print-preview__paginated-export {
    position: fixed !important;
    top: 0 !important;
    left: -14000px !important;
    width: var(--paper-width) !important;
    height: auto !important;
    overflow: visible !important;
    pointer-events: none !important;
    opacity: 0 !important;
}
.document-print-preview__paginated-export .paginated-print-preview,
.document-print-preview__paginated-export .paginated-print-preview__shell,
.document-print-preview__paginated-export .paginated-print-preview__frame {
    width: var(--paper-width) !important;
    margin: 0 !important;
    transform: none !important;
    transform-origin: top left !important;
}
.document-print-preview__paginated-export .paginated-print-preview__editor .ProseMirror,
.document-print-preview__paginated-export .paginated-print-preview__editor .rm-with-pagination {
    box-shadow: none !important;
}
@media print {
    .document-print-preview,
    .document-print-preview__body,
    .document-print-preview .paginated-print-preview__editor .rm-pagination-gap {
        background: #ffffff !important;
    }
    .document-print-preview .paginated-print-preview__editor .ProseMirror,
    .document-print-preview .paginated-print-preview__editor .rm-with-pagination {
        box-shadow: none !important;
    }
}
`;

const PaginatedPrintPreviewCanvas = dynamic(
    () => import('./PaginatedPrintPreviewCanvas').then((module) => module.PaginatedPrintPreviewCanvas),
    {
        ssr: false,
        loading: () => <PrintPreviewLoadingCanvas />,
    },
);

interface DocumentPrintPreviewDialogProps {
    documentId: string;
    title: string;
    status: string;
    content: Record<string, unknown> | null;
    layout: DocumentLayout;
    pageCount: number;
    pageHeight: number;
    contentHeight: number;
    overlayContent?: ReactNode;
    onClose: () => void;
}

function getPreviewZoom() {
    if (typeof window === 'undefined') return 0.72;
    if (window.innerWidth < 720) return 0.46;
    if (window.innerWidth < 1100) return 0.58;
    return 0.72;
}

function usesDefaultHeaderFooterChrome(layout: DocumentLayout) {
    const defaults = DEFAULT_DOCUMENT_LAYOUT.headerFooter;

    return layout.headerFooter.headerEnabled === defaults.headerEnabled &&
        layout.headerFooter.footerEnabled === defaults.footerEnabled &&
        layout.headerFooter.pageNumbersEnabled === defaults.pageNumbersEnabled &&
        layout.headerFooter.headerText.trim() === defaults.headerText &&
        layout.headerFooter.footerText.trim() === defaults.footerText;
}

function getPreviewLayout(layout: DocumentLayout): DocumentLayout {
    if (!usesDefaultHeaderFooterChrome(layout)) return layout;

    return {
        ...layout,
        headerFooter: {
            ...layout.headerFooter,
            headerEnabled: false,
            footerEnabled: false,
            pageNumbersEnabled: false,
        },
    };
}

/**
 * Renders the lightweight placeholder used while the optional paginated renderer loads.
 */
function PrintPreviewLoadingCanvas() {
    return (
        <div className="ded-canvas paginated-print-preview">
            <div className="paginated-print-preview__shell">
                <DocumentLoadingState variant="paper" message="Preparing preview..." />
            </div>
        </div>
    );
}

type PaginatedPreviewState = 'loading' | 'ready' | 'failed';
type PaginatedExportState = 'loading' | 'ready' | 'failed';
type PrintPreviewExportSource = 'paginated-preview' | 'legacy-fallback';

function removeDetachedPaginatedExportHosts() {
    document
        .querySelectorAll(PAGINATED_EXPORT_HOST_SELECTOR)
        .forEach((element) => element.remove());
}

function auditPrintPreviewCleanup() {
    if (process.env.NODE_ENV === 'production') return;

    const leakedExportHosts = document.querySelectorAll(PAGINATED_EXPORT_HOST_SELECTOR).length;
    const leakedHiddenEditors = document.querySelectorAll(
        '.document-print-preview__paginated-export [data-paginated-print-export-root="true"]',
    ).length;

    if (leakedExportHosts > 0 || leakedHiddenEditors > 0) {
        console.warn('Print preview cleanup audit found stale hidden preview DOM.', {
            leakedExportHosts,
            leakedHiddenEditors,
        });
    }
}

function clearPreviewElementRefs(
    ...refs: Array<RefObject<HTMLDivElement | null>>
) {
    refs.forEach((ref) => {
        ref.current = null;
    });
}

/**
 * Displays the read-only document print preview and keeps PDF export on the stable renderer.
 */
export function DocumentPrintPreviewDialog({
    documentId,
    title,
    status,
    content,
    layout,
    pageCount,
    pageHeight,
    contentHeight,
    overlayContent,
    onClose,
}: DocumentPrintPreviewDialogProps) {
    const previewCanvasRef = useRef<HTMLDivElement>(null);
    const paginatedExportCanvasRef = useRef<HTMLDivElement>(null);
    const exportCanvasRef = useRef<HTMLDivElement>(null);
    const isMountedRef = useRef(false);
    const previewReadyTimeoutRef = useRef<number | null>(null);
    const exportReadyTimeoutRef = useRef<number | null>(null);
    const [savingPdf, setSavingPdf] = useState(false);
    const [zoom, setZoom] = useState(getPreviewZoom);
    const [paginatedPreviewState, setPaginatedPreviewState] =
        useState<PaginatedPreviewState>('loading');
    const [paginatedExportState, setPaginatedExportState] =
        useState<PaginatedExportState>('loading');

    useEffect(() => {
        isMountedRef.current = true;
        document.body.classList.add('document-print-preview-active');
        let resizeFrame: number | null = null;
        const onResize = () => {
            if (resizeFrame !== null) {
                window.cancelAnimationFrame(resizeFrame);
            }
            resizeFrame = window.requestAnimationFrame(() => {
                resizeFrame = null;
                setZoom(getPreviewZoom());
            });
        };
        window.addEventListener('resize', onResize);
        return () => {
            isMountedRef.current = false;
            document.body.classList.remove('document-print-preview-active');
            window.removeEventListener('resize', onResize);
            if (resizeFrame !== null) {
                window.cancelAnimationFrame(resizeFrame);
            }
            if (previewReadyTimeoutRef.current !== null) {
                window.clearTimeout(previewReadyTimeoutRef.current);
                previewReadyTimeoutRef.current = null;
            }
            if (exportReadyTimeoutRef.current !== null) {
                window.clearTimeout(exportReadyTimeoutRef.current);
                exportReadyTimeoutRef.current = null;
            }
            removeDetachedPaginatedExportHosts();
            clearPreviewElementRefs(previewCanvasRef, paginatedExportCanvasRef, exportCanvasRef);
            auditPrintPreviewCleanup();
        };
    }, []);

    useEffect(() => {
        const handleTiptapMountTimingError = (event: ErrorEvent) => {
            if (!event.message.includes(TIPTAP_VIEW_NOT_MOUNTED_ERROR)) return;
            event.preventDefault();
        };
        const handleUnhandledTiptapMountTimingError = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const message = reason instanceof Error ? reason.message : String(reason ?? '');
            if (!message.includes(TIPTAP_VIEW_NOT_MOUNTED_ERROR)) return;
            event.preventDefault();
        };

        window.addEventListener('error', handleTiptapMountTimingError);
        window.addEventListener('unhandledrejection', handleUnhandledTiptapMountTimingError);

        return () => {
            window.removeEventListener('error', handleTiptapMountTimingError);
            window.removeEventListener('unhandledrejection', handleUnhandledTiptapMountTimingError);
        };
    }, []);

    useEffect(() => {
        setPaginatedPreviewState('loading');
        setPaginatedExportState('loading');
    }, [content, documentId, layout, status, title]);

    useEffect(() => {
        if (!USE_PAGINATED_PRINT_PREVIEW || paginatedPreviewState !== 'loading') return;

        if (previewReadyTimeoutRef.current !== null) {
            window.clearTimeout(previewReadyTimeoutRef.current);
        }
        previewReadyTimeoutRef.current = window.setTimeout(() => {
            previewReadyTimeoutRef.current = null;
            if (!isMountedRef.current) return;
            setPaginatedPreviewState((currentState) => (
                currentState === 'loading' ? 'failed' : currentState
            ));
        }, PAGINATED_PREVIEW_READY_TIMEOUT_MS);

        return () => {
            if (previewReadyTimeoutRef.current !== null) {
                window.clearTimeout(previewReadyTimeoutRef.current);
                previewReadyTimeoutRef.current = null;
            }
        };
    }, [content, documentId, layout, paginatedPreviewState, status, title]);

    useEffect(() => {
        if (!USE_PAGINATED_PRINT_PREVIEW || paginatedExportState !== 'loading') return;

        if (exportReadyTimeoutRef.current !== null) {
            window.clearTimeout(exportReadyTimeoutRef.current);
        }
        exportReadyTimeoutRef.current = window.setTimeout(() => {
            exportReadyTimeoutRef.current = null;
            if (!isMountedRef.current) return;
            setPaginatedExportState((currentState) => (
                currentState === 'loading' ? 'failed' : currentState
            ));
        }, PAGINATED_EXPORT_READY_TIMEOUT_MS);

        return () => {
            if (exportReadyTimeoutRef.current !== null) {
                window.clearTimeout(exportReadyTimeoutRef.current);
                exportReadyTimeoutRef.current = null;
            }
        };
    }, [content, documentId, layout, paginatedExportState, status, title]);

    const handlePaginatedPreviewReady = useCallback(() => {
        if (!isMountedRef.current) return;
        setPaginatedPreviewState('ready');
    }, []);

    const handlePaginatedPreviewFailure = useCallback(() => {
        if (!isMountedRef.current) return;
        setPaginatedPreviewState('failed');
    }, []);

    const handlePaginatedExportReady = useCallback(() => {
        if (!isMountedRef.current) return;
        setPaginatedExportState('ready');
    }, []);

    const handlePaginatedExportFailure = useCallback(() => {
        if (!isMountedRef.current) return;
        setPaginatedExportState('failed');
    }, []);

    async function handleSavePdf() {
        setSavingPdf(true);
        try {
            const paginatedExportRoot = paginatedExportCanvasRef.current;

            if (paginatedExportState === 'ready' && paginatedExportRoot) {
                try {
                    await savePaginatedPreviewAsPdf(paginatedExportRoot, title);
                    return;
                } catch (error) {
                    console.warn('Paginated PDF export failed; using legacy export fallback.', error);
                    if (isMountedRef.current) {
                        setPaginatedExportState('failed');
                    }
                }
            }

            const exportHost = SAVE_PDF_USES_EXISTING_EXPORT_CANVAS
                ? exportCanvasRef.current
                : previewCanvasRef.current;
            const exportRoot = exportHost?.querySelector(
                '[data-document-export-root="true"]',
            ) as HTMLElement | null;
            if (!exportRoot) return;

            await saveRenderedDocumentAs('pdf', title, exportRoot);
        } finally {
            removeDetachedPaginatedExportHosts();
            auditPrintPreviewCleanup();
            if (isMountedRef.current) {
                setSavingPdf(false);
            }
        }
    }

    const emptyAnchors: CommentAnchorInput[] = [];
    const previewLayout = getPreviewLayout(layout);
    const previewPaperStyle = buildDocumentLayoutStyle(previewLayout);
    const shouldUsePaginatedPreview =
        USE_PAGINATED_PRINT_PREVIEW && paginatedPreviewState !== 'failed';
    const shouldRenderPaginatedExport =
        USE_PAGINATED_PRINT_PREVIEW && paginatedExportState !== 'failed';
    const preparedPdfExportSource: PrintPreviewExportSource =
        paginatedExportState === 'ready' ? 'paginated-preview' : 'legacy-fallback';
    const previewResetKey = `${documentId}:${title}:${status}`;
    const exportResetKey = `${previewResetKey}:export`;
    const continuousPreviewCanvas = (
        <PagedDocumentCanvas
            canvasRef={previewCanvasRef}
            documentId={`${documentId}-print-preview`}
            title={title}
            status={status}
            content={content}
            isReadOnly
            zoomScale={zoom}
            pageCount={pageCount}
            pageHeight={pageHeight}
            contentHeight={contentHeight}
            printLayout
            showFormattingMarks={false}
            paperStyle={previewPaperStyle}
            headerFooter={previewLayout.headerFooter}
            showRepeatedPageChrome
            pageGap={PAPER_PAGE_GAP_PX}
            overlayContent={null}
            commentAnchors={emptyAnchors}
            onEditorReady={() => undefined}
        />
    );

    return (
        <div
            className="document-print-preview"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-print-preview-title"
            data-prepared-pdf-export-source={preparedPdfExportSource}
        >
            <style>{PAGINATED_PRINT_PREVIEW_STYLES}</style>
            <div className="document-print-preview__toolbar">
                <div>
                    <p className="document-print-preview__eyebrow">Print preview</p>
                    <h2 id="document-print-preview-title">{title}</h2>
                    <span>
                        {pageCount} page{pageCount === 1 ? '' : 's'} · Same geometry as PDF export
                    </span>
                </div>
                <div className="document-print-preview__actions">
                    <button type="button" className="btn-ghost" onClick={onClose}>
                        Close
                    </button>
                    <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => window.print()}
                    >
                        Print
                    </button>
                    <button
                        type="button"
                        className="btn-primary"
                        disabled={savingPdf || paginatedExportState === 'loading'}
                        onClick={() => { void handleSavePdf(); }}
                    >
                        {savingPdf || paginatedExportState === 'loading' ? 'Preparing…' : 'Save PDF'}
                    </button>
                </div>
            </div>
            <div className="document-print-preview__body">
                {shouldUsePaginatedPreview ? (
                    <PrintPreviewRendererBoundary
                        resetKey={previewResetKey}
                        fallback={continuousPreviewCanvas}
                        onError={handlePaginatedPreviewFailure}
                    >
                        <PaginatedPrintPreviewCanvas
                            canvasRef={previewCanvasRef}
                            documentId={`${documentId}-paginated-print-preview`}
                            title={title}
                            status={status}
                            content={content}
                            layout={previewLayout}
                            zoomScale={zoom}
                            pageGap={PAPER_PAGE_GAP_PX}
                            renderMode="preview"
                            bottomOverlay={overlayContent}
                            onReady={handlePaginatedPreviewReady}
                            onPreviewError={handlePaginatedPreviewFailure}
                        />
                    </PrintPreviewRendererBoundary>
                ) : (
                    continuousPreviewCanvas
                )}

                {shouldRenderPaginatedExport && (
                    <div className="document-print-preview__paginated-export" aria-hidden="true">
                        <PrintPreviewRendererBoundary
                            resetKey={exportResetKey}
                            fallback={null}
                            onError={handlePaginatedExportFailure}
                        >
                            <PaginatedPrintPreviewCanvas
                                canvasRef={paginatedExportCanvasRef}
                                documentId={`${documentId}-paginated-pdf-export`}
                                title={title}
                                status={status}
                                content={content}
                                layout={previewLayout}
                                zoomScale={1}
                                pageGap={PAPER_PAGE_GAP_PX}
                                renderMode="export"
                                bottomOverlay={overlayContent}
                                onReady={handlePaginatedExportReady}
                                onPreviewError={handlePaginatedExportFailure}
                            />
                        </PrintPreviewRendererBoundary>
                    </div>
                )}

                {SAVE_PDF_USES_EXISTING_EXPORT_CANVAS && (
                    <div className="document-print-preview__export-fallback" aria-hidden="true">
                        <PagedDocumentCanvas
                            canvasRef={exportCanvasRef}
                            documentId={`${documentId}-print-export-fallback`}
                            title={title}
                            status={status}
                            content={content}
                            isReadOnly
                            zoomScale={1}
                            pageCount={pageCount}
                            pageHeight={pageHeight}
                            contentHeight={contentHeight}
                            printLayout
                            showFormattingMarks={false}
                            paperStyle={previewPaperStyle}
                            headerFooter={previewLayout.headerFooter}
                            showRepeatedPageChrome
                            pageGap={PAPER_PAGE_GAP_PX}
                            overlayContent={overlayContent}
                            commentAnchors={emptyAnchors}
                            onEditorReady={() => undefined}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
