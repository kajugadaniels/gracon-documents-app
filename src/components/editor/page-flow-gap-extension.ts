'use client';

/**
 * Visual-only pagination gap decorations for long TipTap text blocks.
 *
 * Block-level page-gap offsets cannot fix a single paragraph that flows across
 * a page boundary. This extension inserts ProseMirror widget decorations at
 * measured page content boundaries so long paragraphs visually resume at the
 * next page's writable top without mutating the saved document JSON.
 */
import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface PageFlowGapState {
    decorations: DecorationSet;
    signature: string;
}

interface PageFlowGapMeta {
    decorations: DecorationSet;
    signature: string;
}

interface PageFlowGapWidget {
    pos: number;
    height: number;
    pageNumber: number;
}

const pageFlowGapPluginKey = new PluginKey<PageFlowGapState>('pageFlowGaps');
const TEXT_BLOCK_TYPES = new Set(['paragraph', 'heading']);
const MIN_GAP_HEIGHT_PX = 24;

function parseCssPx(value: string, fallback = 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getPageFlowMetrics(rootEl: HTMLElement) {
    const frameEl = rootEl.closest<HTMLElement>('[data-document-export-root="true"]');
    const rootStyles = window.getComputedStyle(rootEl);
    const pageHeight = parseCssPx(frameEl?.dataset.documentPageHeight ?? '', 1123);
    const pageGap = parseCssPx(frameEl?.dataset.documentPageGap ?? '', 0);
    const contentTopInset = parseCssPx(rootStyles.paddingTop);
    const contentBottomInset = parseCssPx(rootStyles.paddingBottom);

    return {
        pageHeight,
        pageGap,
        pagePitch: pageHeight + pageGap,
        contentTopInset,
        contentBottomInset,
    };
}

function getRelativeBlockBounds(rootEl: HTMLElement, blockEl: HTMLElement) {
    const rootRect = rootEl.getBoundingClientRect();
    const blockRect = blockEl.getBoundingClientRect();
    const top = blockRect.top - rootRect.top + rootEl.scrollTop;

    return {
        top,
        bottom: top + blockRect.height,
    };
}

function createGapWidget(height: number, pageNumber: number) {
    return () => {
        const widget = document.createElement('span');
        widget.className = 'document-flow-page-gap-widget';
        widget.contentEditable = 'false';
        widget.setAttribute('aria-hidden', 'true');
        widget.setAttribute('data-page-gap-after', String(pageNumber));
        widget.style.setProperty('--document-flow-page-gap-widget-height', `${height}px`);
        return widget;
    };
}

function collectTextBlockPositions(doc: ProseMirrorNode) {
    const positions: { pos: number; node: ProseMirrorNode }[] = [];

    doc.descendants((node, pos) => {
        if (TEXT_BLOCK_TYPES.has(node.type.name)) {
            positions.push({ pos, node });
        }
    });

    return positions;
}

function sameWidgets(left: PageFlowGapWidget[], right: PageFlowGapWidget[]) {
    return left.length === right.length && left.every((widget, index) => {
        const other = right[index];
        return Boolean(other) &&
            widget.pos === other.pos &&
            widget.height === other.height &&
            widget.pageNumber === other.pageNumber;
    });
}

function buildWidgetSignature(widgets: PageFlowGapWidget[]) {
    return widgets.map((widget) => `${widget.pageNumber}:${widget.pos}:${widget.height}`).join('|');
}

function measurePageFlowGapWidgets(view: EditorView) {
    const rootEl = view.dom as HTMLElement;
    const {
        pageHeight,
        pageGap,
        pagePitch,
        contentTopInset,
        contentBottomInset,
    } = getPageFlowMetrics(rootEl);

    if (pageHeight <= 0 || pageGap <= 0) return [];

    const rootRect = rootEl.getBoundingClientRect();
    const rootStyles = window.getComputedStyle(rootEl);
    const probeX = rootRect.left + parseCssPx(rootStyles.paddingLeft) + 4;
    const docHeight = Math.max(rootEl.scrollHeight, pageHeight);
    const pageCount = Math.max(1, Math.ceil((docHeight + pageGap) / pagePitch));
    const widgets: PageFlowGapWidget[] = [];

    collectTextBlockPositions(view.state.doc).forEach(({ pos, node }) => {
        const blockEl = view.nodeDOM(pos);
        if (!(blockEl instanceof HTMLElement)) return;

        const bounds = getRelativeBlockBounds(rootEl, blockEl);

        for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
            const pageStart = pageIndex * pagePitch;
            const contentBottom = pageStart + pageHeight - contentBottomInset;
            const nextContentTop = ((pageIndex + 1) * pagePitch) + contentTopInset;
            const gapHeight = Math.max(MIN_GAP_HEIGHT_PX, Math.round(nextContentTop - contentBottom));

            if (bounds.top >= contentBottom || bounds.bottom <= contentBottom) continue;

            const resolved = view.posAtCoords({
                left: probeX,
                top: rootRect.top + contentBottom - 2,
            });
            if (!resolved) continue;

            const minPos = pos + 1;
            const maxPos = pos + node.nodeSize - 1;
            const widgetPos = Math.min(Math.max(resolved.pos, minPos), maxPos);

            widgets.push({
                pos: widgetPos,
                height: gapHeight,
                pageNumber: pageIndex + 1,
            });
        }
    });

    return widgets
        .sort((left, right) => left.pos - right.pos || left.pageNumber - right.pageNumber)
        .filter((widget, index, source) => (
            index === 0 ||
            widget.pos !== source[index - 1].pos ||
            widget.pageNumber !== source[index - 1].pageNumber
        ));
}

function buildDecorationSet(doc: ProseMirrorNode, widgets: PageFlowGapWidget[]) {
    return DecorationSet.create(
        doc,
        widgets.map((widget) => Decoration.widget(
            widget.pos,
            createGapWidget(widget.height, widget.pageNumber),
            {
                key: `page-flow-gap-${widget.pageNumber}-${widget.pos}`,
                side: -1,
            },
        )),
    );
}

export const PageFlowGapExtension = Extension.create({
    name: 'pageFlowGaps',

    addProseMirrorPlugins() {
        return [
            new Plugin<PageFlowGapState>({
                key: pageFlowGapPluginKey,
                state: {
                    init: () => ({
                        decorations: DecorationSet.empty,
                        signature: '',
                    }),
                    apply(tr, value) {
                        const meta = tr.getMeta(pageFlowGapPluginKey) as PageFlowGapMeta | undefined;
                        if (meta) return meta;
                        if (tr.docChanged) {
                            return {
                                decorations: value.decorations.map(tr.mapping, tr.doc),
                                signature: value.signature,
                            };
                        }
                        return value;
                    },
                },
                props: {
                    decorations(state) {
                        return pageFlowGapPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
                    },
                },
                view(view) {
                    let frameId: number | null = null;
                    let lastWidgets: PageFlowGapWidget[] = [];

                    function scheduleMeasure() {
                        if (frameId !== null) window.cancelAnimationFrame(frameId);
                        frameId = window.requestAnimationFrame(() => {
                            frameId = null;
                            const widgets = measurePageFlowGapWidgets(view);
                            if (sameWidgets(lastWidgets, widgets)) return;

                            lastWidgets = widgets;
                            const decorations = buildDecorationSet(view.state.doc, widgets);
                            view.dispatch(
                                view.state.tr
                                    .setMeta(pageFlowGapPluginKey, {
                                        decorations,
                                        signature: buildWidgetSignature(widgets),
                                    })
                                    .setMeta('addToHistory', false),
                            );
                        });
                    }

                    const resizeObserver = new ResizeObserver(scheduleMeasure);
                    resizeObserver.observe(view.dom);
                    const mutationObserver = new MutationObserver(scheduleMeasure);
                    mutationObserver.observe(view.dom, { childList: true, subtree: true, characterData: true });
                    window.addEventListener('resize', scheduleMeasure);
                    scheduleMeasure();

                    return {
                        update: scheduleMeasure,
                        destroy() {
                            if (frameId !== null) window.cancelAnimationFrame(frameId);
                            resizeObserver.disconnect();
                            mutationObserver.disconnect();
                            window.removeEventListener('resize', scheduleMeasure);
                        },
                    };
                },
            }),
        ];
    },
});
