'use client';

import { useEffect, useRef, useState } from 'react';
import { saveRenderedDocumentAs } from '@/lib/export-document';
import type { DocumentLayout } from '@/lib/document-layout';
import { buildDocumentLayoutStyle } from '@/lib/document-layout';
import { PagedDocumentCanvas } from './PagedDocumentCanvas';
import type { CommentAnchorInput } from './comment-anchor-extension';

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
    const canvasRef = useRef<HTMLDivElement>(null);
    const [savingPdf, setSavingPdf] = useState(false);
    const [zoom, setZoom] = useState(getPreviewZoom);

    useEffect(() => {
        document.body.classList.add('document-print-preview-active');
        const onResize = () => setZoom(getPreviewZoom());
        window.addEventListener('resize', onResize);
        return () => {
            document.body.classList.remove('document-print-preview-active');
            window.removeEventListener('resize', onResize);
        };
    }, []);

    async function handleSavePdf() {
        const exportRoot = canvasRef.current?.querySelector(
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

    return (
        <div
            className="document-print-preview"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-print-preview-title"
        >
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
                <PagedDocumentCanvas
                    canvasRef={canvasRef}
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
                    paperStyle={buildDocumentLayoutStyle(layout)}
                    headerFooter={layout.headerFooter}
                    overlayContent={null}
                    commentAnchors={emptyAnchors}
                    onEditorReady={() => undefined}
                />
            </div>
        </div>
    );
}
