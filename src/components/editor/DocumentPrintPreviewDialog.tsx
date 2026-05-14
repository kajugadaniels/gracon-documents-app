'use client';

// Owns the modal print-preview shell while keeping experimental pagination isolated.
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { saveRenderedDocumentAs } from '@/lib/export-document';
import { PAPER_PAGE_GAP_PX } from '@/constants/document-paper';
import { DEFAULT_DOCUMENT_LAYOUT, type DocumentLayout } from '@/lib/document-layout';
import { buildDocumentLayoutStyle } from '@/lib/document-layout';
import { PagedDocumentCanvas } from './PagedDocumentCanvas';
import { PrintPreviewRendererBoundary } from './PrintPreviewRendererBoundary';
import type { CommentAnchorInput } from '@/store/editor/comment-anchor-extension';

const USE_PAGINATED_PRINT_PREVIEW = true;
const SAVE_PDF_USES_EXISTING_EXPORT_CANVAS = true;
const PAGINATED_PREVIEW_READY_TIMEOUT_MS = 8000;
const TIPTAP_VIEW_NOT_MOUNTED_ERROR = 'The editor view is not available';
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
                <div className="paginated-print-preview__loading">
                    Preparing preview...
                </div>
            </div>
        </div>
    );
}

type PaginatedPreviewState = 'loading' | 'ready' | 'failed';

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
    onClose,
}: DocumentPrintPreviewDialogProps) {
    const previewCanvasRef = useRef<HTMLDivElement>(null);
    const exportCanvasRef = useRef<HTMLDivElement>(null);
    const [savingPdf, setSavingPdf] = useState(false);
    const [zoom, setZoom] = useState(getPreviewZoom);
    const [paginatedPreviewState, setPaginatedPreviewState] =
        useState<PaginatedPreviewState>('loading');

    useEffect(() => {
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
            document.body.classList.remove('document-print-preview-active');
            window.removeEventListener('resize', onResize);
            if (resizeFrame !== null) {
                window.cancelAnimationFrame(resizeFrame);
            }
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
    }, [content, documentId, layout, status, title]);

    useEffect(() => {
        if (!USE_PAGINATED_PRINT_PREVIEW || paginatedPreviewState !== 'loading') return;

        const timeoutId = window.setTimeout(() => {
            setPaginatedPreviewState((currentState) => (
                currentState === 'loading' ? 'failed' : currentState
            ));
        }, PAGINATED_PREVIEW_READY_TIMEOUT_MS);

        return () => window.clearTimeout(timeoutId);
    }, [content, documentId, layout, paginatedPreviewState, status, title]);

    const handlePaginatedPreviewReady = useCallback(() => {
        setPaginatedPreviewState('ready');
    }, []);

    const handlePaginatedPreviewFailure = useCallback(() => {
        setPaginatedPreviewState('failed');
    }, []);

    async function handleSavePdf() {
        const exportHost = SAVE_PDF_USES_EXISTING_EXPORT_CANVAS
            ? exportCanvasRef.current
            : previewCanvasRef.current;
        const exportRoot = exportHost?.querySelector(
            '[data-document-export-root="true"]',
        ) as HTMLElement | null;
        if (!exportRoot) return;

        setSavingPdf(true);
        try {
            await saveRenderedDocumentAs('pdf', title, exportRoot);
        } finally {
            setSavingPdf(false);
        }
    }

    const emptyAnchors: CommentAnchorInput[] = [];
    const previewLayout = getPreviewLayout(layout);
    const previewPaperStyle = buildDocumentLayoutStyle(previewLayout);
    const shouldUsePaginatedPreview =
        USE_PAGINATED_PRINT_PREVIEW && paginatedPreviewState !== 'failed';
    const previewResetKey = `${documentId}:${title}:${status}`;
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
                        disabled={savingPdf}
                        onClick={() => { void handleSavePdf(); }}
                    >
                        {savingPdf ? 'Preparing…' : 'Save PDF'}
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
                            onReady={handlePaginatedPreviewReady}
                            onPreviewError={handlePaginatedPreviewFailure}
                        />
                    </PrintPreviewRendererBoundary>
                ) : (
                    continuousPreviewCanvas
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
                            overlayContent={null}
                            commentAnchors={emptyAnchors}
                            onEditorReady={() => undefined}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
