/**
 * Measures visual A4 pagination for the current editor without changing
 * the Tiptap document. This keeps autosave, hashes, comments, and undo safe.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
    A4_PAPER_ASPECT_RATIO,
    A4_PAPER_HEIGHT_PX,
} from '@/constants/document-paper';

export interface DocumentPaginationPage {
    pageNumber: number;
    top: number;
}

interface DocumentPaginationLayout {
    pageCount: number;
    pageHeight: number;
    contentHeight: number;
}

const INITIAL_LAYOUT: DocumentPaginationLayout = {
    pageCount: 1,
    pageHeight: A4_PAPER_HEIGHT_PX,
    contentHeight: A4_PAPER_HEIGHT_PX,
};

function layoutsEqual(a: DocumentPaginationLayout, b: DocumentPaginationLayout) {
    return a.pageCount === b.pageCount
        && a.pageHeight === b.pageHeight
        && a.contentHeight === b.contentHeight;
}

function measurePaperLayout(editorRoot: HTMLElement): DocumentPaginationLayout {
    const paperEl = editorRoot.closest('.document-paper-sheet');
    if (!(paperEl instanceof HTMLElement)) return INITIAL_LAYOUT;

    const paperWidth = paperEl.offsetWidth;
    const pageHeight = paperWidth > 0
        ? Math.max(Math.round(paperWidth * A4_PAPER_ASPECT_RATIO), 1)
        : A4_PAPER_HEIGHT_PX;
    const contentHeight = Math.max(
        paperEl.scrollHeight,
        paperEl.offsetHeight,
        A4_PAPER_HEIGHT_PX,
    );

    return {
        pageCount: Math.max(1, Math.ceil(contentHeight / pageHeight)),
        pageHeight,
        contentHeight,
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
