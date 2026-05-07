/**
 * Measures visual A4 pagination for the current editor without changing
 * the Tiptap document. This keeps autosave, hashes, comments, and undo safe.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
    A4_PAPER_HEIGHT_PX,
    PAPER_CONTENT_INNER_HEIGHT_PX,
    PAPER_PAGE_GAP_PX,
} from '@/constants/document-paper';
import {
    createEmptyTiptapPaginationMetrics,
    measureTiptapPagination,
    type TiptapPaginationMetrics,
} from '@/lib/tiptap/tiptap-page-metrics';

export interface DocumentPaginationPage {
    pageNumber: number;
    top: number;
}

interface DocumentPaginationLayout {
    pageCount: number;
    activePage: number;
    pageHeight: number;
    contentHeight: number;
    metrics: TiptapPaginationMetrics;
}

const INITIAL_LAYOUT: DocumentPaginationLayout = {
    pageCount: 1,
    activePage: 1,
    pageHeight: A4_PAPER_HEIGHT_PX,
    contentHeight: A4_PAPER_HEIGHT_PX,
    metrics: createEmptyTiptapPaginationMetrics(),
};

function layoutsEqual(a: DocumentPaginationLayout, b: DocumentPaginationLayout) {
    return a.pageCount === b.pageCount
        && a.activePage === b.activePage
        && a.pageHeight === b.pageHeight
        && a.contentHeight === b.contentHeight
        && a.metrics.outline.length === b.metrics.outline.length;
}

function measurePaperLayout(editorRoot: HTMLElement): DocumentPaginationLayout {
    const metrics = measureTiptapPagination(editorRoot, {
        pageHeight: A4_PAPER_HEIGHT_PX,
        pageGap: PAPER_PAGE_GAP_PX,
        contentHeight: PAPER_CONTENT_INNER_HEIGHT_PX,
    });

    const contentHeight = Math.max(
        editorRoot.scrollHeight,
        A4_PAPER_HEIGHT_PX,
    );

    return {
        pageCount: metrics.pageCount,
        activePage: metrics.activePage,
        pageHeight: A4_PAPER_HEIGHT_PX,
        contentHeight,
        metrics,
    };
}

/**
 * Observes the rendered editor and returns page measurements for UI guides.
 */
export function useDocumentPagination(editor: Editor | null) {
    const [layout, setLayout] = useState<DocumentPaginationLayout>(INITIAL_LAYOUT);

    useEffect(() => {
        if (!editor) return;

        const editorRoot = editor.view.dom;
        const paperEl = editorRoot.closest('.document-paper-sheet');
        let frameId: number | null = null;
        let mounted = true;

        function scheduleMeasure() {
            if (!mounted) return;
            if (frameId !== null) window.cancelAnimationFrame(frameId);
            frameId = window.requestAnimationFrame(() => {
                if (!mounted) return;
                frameId = null;
                const nextLayout = measurePaperLayout(editorRoot);
                setLayout((current) => (
                    layoutsEqual(current, nextLayout) ? current : nextLayout
                ));
            });
        }

        const resizeObserver = new ResizeObserver(scheduleMeasure);
        resizeObserver.observe(editorRoot);
        if (paperEl instanceof HTMLElement) resizeObserver.observe(paperEl);

        editor.on('selectionUpdate', scheduleMeasure);
        editor.on('update', scheduleMeasure);
        editor.on('transaction', scheduleMeasure);
        window.addEventListener('resize', scheduleMeasure);
        scheduleMeasure();

        if ('fonts' in document) {
            void document.fonts.ready.then(() => {
                if (mounted) scheduleMeasure();
            });
        }

        return () => {
            mounted = false;
            if (frameId !== null) window.cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
            editor.off('selectionUpdate', scheduleMeasure);
            editor.off('update', scheduleMeasure);
            editor.off('transaction', scheduleMeasure);
            window.removeEventListener('resize', scheduleMeasure);
        };
    }, [editor]);

    const pages = useMemo<DocumentPaginationPage[]>(
        () => Array.from({ length: layout.pageCount }, (_, index) => ({
            pageNumber: index + 1,
            top: index * layout.pageHeight,
        })),
        [layout.pageCount, layout.pageHeight],
    );

    return {
        ...layout,
        pages,
    };
}
