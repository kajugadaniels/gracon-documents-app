'use client';

/**
 * PaginatedPaperCanvas
 *
 * Renders stacked A4 sheets behind a single live ProseMirror editor and keeps
 * page count in sync with measured overflow. The editor remains one instance,
 * but page break spacers create real vertical handoff from one page to the next.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { DocumentPaperSheet } from '@/components/documents/DocumentPaperSheet';
import {
    measurePaginationBreaks,
    setPaginationBreaks,
    type PaginationMetrics,
} from './document-pagination';

interface PaginatedPaperCanvasProps {
    editor: Editor;
    paperStatus?: string;
    overlayContent?: ReactNode;
}

function readPixelValue(value: string) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getFooterLabel(paperStatus?: string) {
    if (!paperStatus) return 'Editable draft';
    return `${paperStatus.toLowerCase()} document`;
}

function readPaginationMetrics(
    contentEl: HTMLElement,
    pagesEl: HTMLDivElement,
    firstPageEl: HTMLElement,
): PaginationMetrics {
    const contentStyles = window.getComputedStyle(contentEl);
    const pageStyles = window.getComputedStyle(pagesEl);

    return {
        pageHeight: firstPageEl.getBoundingClientRect().height,
        pageGap: readPixelValue(pageStyles.rowGap),
        paddingTop: readPixelValue(contentStyles.paddingTop),
        paddingBottom: readPixelValue(contentStyles.paddingBottom),
    };
}

/**
 * Stacked A4 paper renderer for the live rich text editor.
 */
export function PaginatedPaperCanvas({
    editor,
    paperStatus,
    overlayContent,
}: PaginatedPaperCanvasProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const pagesRef = useRef<HTMLDivElement>(null);
    const [pageCount, setPageCount] = useState(1);

    const footerLabel = useMemo(() => getFooterLabel(paperStatus), [paperStatus]);
    const pageNumbers = useMemo(
        () => Array.from({ length: pageCount }, (_, index) => index + 1),
        [pageCount],
    );

    useEffect(() => {
        let frameId = 0;

        const measure = () => {
            window.cancelAnimationFrame(frameId);
            frameId = window.requestAnimationFrame(() => {
                const rootEl = rootRef.current;
                const pagesEl = pagesRef.current;
                const contentEl = rootEl?.querySelector('.ProseMirror') as HTMLElement | null;
                const firstPageEl = pagesEl?.querySelector('.document-paper-sheet') as HTMLElement | null;

                if (!rootEl || !pagesEl || !contentEl || !firstPageEl) return;

                const metrics = readPaginationMetrics(contentEl, pagesEl, firstPageEl);
                const pagination = measurePaginationBreaks(editor, contentEl, metrics);

                setPaginationBreaks(editor, pagination.breaks);
                setPageCount((current) => (
                    current === pagination.pageCount ? current : pagination.pageCount
                ));
            });
        };

        const handleUpdate = () => {
            measure();
        };

        measure();
        editor.on('update', handleUpdate);

        const observer = new ResizeObserver(() => {
            measure();
        });

        const rootEl = rootRef.current;
        const pagesEl = pagesRef.current;
        const contentEl = rootEl?.querySelector('.ProseMirror');
        if (rootEl) observer.observe(rootEl);
        if (pagesEl) observer.observe(pagesEl);
        if (contentEl instanceof HTMLElement) observer.observe(contentEl);

        window.addEventListener('resize', measure);
        return () => {
            window.cancelAnimationFrame(frameId);
            editor.off('update', handleUpdate);
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [editor]);

    return (
        <div ref={rootRef} className="document-paged-editor">
            <div ref={pagesRef} className="document-paged-editor__pages" aria-hidden="true">
                {pageNumbers.map((pageNumber) => (
                    <DocumentPaperSheet
                        key={pageNumber}
                        className="document-paper-sheet--page-shell"
                        bodyClassName="document-paper-sheet__body--page-shell"
                        footer={(
                            <div className="document-paper-sheet__footer-bar">
                                <span>{footerLabel}</span>
                                <span>Page {pageNumber}</span>
                            </div>
                        )}
                        overlay={pageNumber === pageCount ? overlayContent : undefined}
                    >
                        <div className="document-paper-sheet__page-fill" />
                    </DocumentPaperSheet>
                ))}
            </div>

            <div className="document-paged-editor__surface">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
