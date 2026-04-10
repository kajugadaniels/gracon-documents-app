/**
 * Decoration-based pagination helpers for the live rich text editor.
 *
 * The editor remains a single ProseMirror instance, but we insert widget
 * spacers before overflowing blocks so content continues on the next A4 page
 * instead of stretching one endless sheet.
 */
import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface PaginationBreak {
    pos: number;
    height: number;
}

export interface PaginationMetrics {
    pageHeight: number;
    pageGap: number;
    paddingTop: number;
    paddingBottom: number;
}

interface PaginationState {
    breaks: PaginationBreak[];
}

export const paginationPluginKey = new PluginKey<PaginationState>('documentPagination');

function readPixelValue(value: string) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function breaksEqual(left: PaginationBreak[], right: PaginationBreak[]) {
    if (left.length !== right.length) return false;

    return left.every((item, index) => {
        const next = right[index];
        return item.pos === next.pos && Math.abs(item.height - next.height) < 0.5;
    });
}

function buildDecorations(doc: Parameters<typeof DecorationSet.create>[0], breaks: PaginationBreak[]) {
    const widgets = breaks.map((item) => Decoration.widget(
        item.pos,
        () => {
            const spacer = document.createElement('div');
            spacer.className = 'document-page-break-spacer';
            spacer.dataset.pageBreak = 'true';
            spacer.style.height = `${item.height}px`;
            return spacer;
        },
        { side: -1, key: `page-break-${item.pos}-${Math.round(item.height)}` },
    ));

    return DecorationSet.create(doc, widgets);
}

function getContentBlocks(contentEl: HTMLElement) {
    return Array.from(contentEl.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.pageBreak !== 'true',
    );
}

function measureBlockHeight(block: HTMLElement) {
    const styles = window.getComputedStyle(block);
    return block.getBoundingClientRect().height
        + readPixelValue(styles.marginTop)
        + readPixelValue(styles.marginBottom);
}

function countCurrentPageSpan(usedHeight: number, metrics: PaginationMetrics) {
    const usableHeight = Math.max(
        1,
        metrics.pageHeight - metrics.paddingTop - metrics.paddingBottom,
    );
    const consumedHeight = Math.max(0, usedHeight - metrics.paddingTop);
    return Math.max(1, Math.ceil(consumedHeight / usableHeight));
}

/**
 * Shared pagination decoration plugin.
 */
export const PaginationExtension = Extension.create({
    name: 'documentPagination',

    addProseMirrorPlugins() {
        return [
            new Plugin<PaginationState>({
                key: paginationPluginKey,
                state: {
                    init: () => ({ breaks: [] }),
                    apply: (transaction, value) => {
                        const nextBreaks = transaction.getMeta(paginationPluginKey) as PaginationBreak[] | undefined;
                        return nextBreaks ? { breaks: nextBreaks } : value;
                    },
                },
                props: {
                    decorations: (state) => {
                        const pluginState = paginationPluginKey.getState(state);
                        if (!pluginState?.breaks.length) return null;
                        return buildDecorations(state.doc, pluginState.breaks);
                    },
                },
            }),
        ];
    },
});

/**
 * Returns the currently active pagination breaks for an editor instance.
 */
export function getPaginationBreaks(editor: Editor) {
    return paginationPluginKey.getState(editor.state)?.breaks ?? [];
}

/**
 * Replaces the editor's pagination break widgets when the measured page
 * boundaries change.
 */
export function setPaginationBreaks(editor: Editor, breaks: PaginationBreak[]) {
    if (breaksEqual(getPaginationBreaks(editor), breaks)) return;
    editor.view.dispatch(editor.state.tr.setMeta(paginationPluginKey, breaks));
}

/**
 * Measures the current editor DOM and returns the break spacers needed to keep
 * top-level blocks inside stacked A4 pages.
 */
export function measurePaginationBreaks(
    editor: Editor,
    contentEl: HTMLElement,
    metrics: PaginationMetrics,
) {
    const blocks = getContentBlocks(contentEl);
    if (!blocks.length) {
        return { breaks: [] as PaginationBreak[], pageCount: 1 };
    }

    const pageBottom = metrics.pageHeight - metrics.paddingBottom;
    const breaks: PaginationBreak[] = [];
    let currentPage = 1;
    let usedHeight = metrics.paddingTop;

    for (const block of blocks) {
        const blockHeight = Math.max(1, Math.ceil(measureBlockHeight(block)));
        const shouldMoveToNextPage = usedHeight > metrics.paddingTop && usedHeight + blockHeight > pageBottom;

        if (shouldMoveToNextPage) {
            breaks.push({
                pos: editor.view.posAtDOM(block, 0),
                height: Math.max(0, metrics.pageHeight + metrics.pageGap + metrics.paddingTop - usedHeight),
            });
            currentPage += 1;
            usedHeight = metrics.paddingTop;
        }

        usedHeight += blockHeight;
    }

    return {
        breaks,
        pageCount: Math.max(currentPage, breaks.length + countCurrentPageSpan(usedHeight, metrics)),
    };
}
