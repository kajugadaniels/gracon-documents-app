'use client';

/**
 * Visual-only soft page breaks for print layout.
 *
 * The editor document remains continuous ProseMirror content, but this plugin
 * inserts non-persistent spacer widgets before top-level blocks that would
 * enter the page bottom margin. That keeps the 10-11 inch page band blank and
 * moves the block to the next printable area without changing autosaved JSON.
 */
import { Extension } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Plugin, PluginKey } from '@tiptap/pm/state';

interface SoftPageBreakState {
    decorations: DecorationSet;
    signature: string;
}

interface SoftPageBreakMeta {
    decorations: DecorationSet;
    signature: string;
}

const softPageBreakPluginKey = new PluginKey<SoftPageBreakState>('softPageBreaks');
const MIN_SPACER_HEIGHT_PX = 12;
const DEFAULT_PAGE_HEIGHT_PX = 1123;
const DEFAULT_PAGE_MARGIN_PX = 96;

function parseCssPx(value: string, fallback: number) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function readEditorLayout(view: EditorView) {
    const style = window.getComputedStyle(view.dom);

    return {
        pageHeight: parseCssPx(style.getPropertyValue('--paper-height'), DEFAULT_PAGE_HEIGHT_PX),
        topMargin: parseCssPx(style.getPropertyValue('--editor-page-padding-top'), DEFAULT_PAGE_MARGIN_PX),
        bottomMargin: parseCssPx(style.getPropertyValue('--editor-page-padding-bottom'), DEFAULT_PAGE_MARGIN_PX),
    };
}

function isPrintLayout(view: EditorView) {
    return !view.dom.closest('.document-layout-frame--web-layout');
}

function createSpacer(height: number) {
    const spacer = document.createElement('div');
    spacer.className = 'document-soft-page-break';
    spacer.style.height = `${height}px`;
    spacer.setAttribute('contenteditable', 'false');
    spacer.setAttribute('aria-hidden', 'true');

    const line = document.createElement('span');
    line.className = 'document-soft-page-break__line';
    spacer.appendChild(line);

    return spacer;
}

function buildSoftPageBreakDecorations(view: EditorView): SoftPageBreakMeta {
    if (!isPrintLayout(view)) {
        return {
            decorations: DecorationSet.empty,
            signature: 'web-layout',
        };
    }

    const { pageHeight, topMargin, bottomMargin } = readEditorLayout(view);
    const printableBottom = Math.max(topMargin + MIN_SPACER_HEIGHT_PX, pageHeight - bottomMargin);
    const printableHeight = Math.max(MIN_SPACER_HEIGHT_PX, printableBottom - topMargin);
    const editorTop = view.dom.getBoundingClientRect().top;
    const decorations: Decoration[] = [];
    const signatureParts: string[] = [];

    view.state.doc.forEach((node, offset) => {
        if (!node.isBlock) {
            return;
        }

        const pos = offset;
        const dom = view.nodeDOM(pos);
        if (!(dom instanceof HTMLElement)) {
            return;
        }

        // Ignore our own widgets and oversized blocks. Large tables/images can
        // span pages; moving them repeatedly would create unstable pagination.
        if (dom.classList.contains('document-soft-page-break')) {
            return;
        }

        const rect = dom.getBoundingClientRect();
        const blockTop = rect.top - editorTop;
        const blockBottom = rect.bottom - editorTop;
        const blockHeight = rect.height;
        const pageIndex = Math.max(0, Math.floor(blockTop / pageHeight));
        const topWithinPage = blockTop - (pageIndex * pageHeight);
        const bottomWithinPage = blockBottom - (pageIndex * pageHeight);

        if (blockHeight >= printableHeight) {
            return;
        }

        if (topWithinPage < topMargin || bottomWithinPage <= printableBottom) {
            return;
        }

        const spacerHeight = Math.round(pageHeight - topWithinPage + topMargin);
        if (spacerHeight < MIN_SPACER_HEIGHT_PX) {
            return;
        }

        decorations.push(Decoration.widget(pos, () => createSpacer(spacerHeight), {
            side: -1,
            key: `soft-page-break-${pos}-${spacerHeight}`,
        }));
        signatureParts.push(`${pos}:${spacerHeight}`);
    });

    return {
        decorations: DecorationSet.create(view.state.doc, decorations),
        signature: signatureParts.join('|'),
    };
}

function scheduleSoftPageBreakMeasure(view: EditorView) {
    let frameId: number | null = null;

    function schedule() {
        if (frameId !== null) {
            window.cancelAnimationFrame(frameId);
        }

        frameId = window.requestAnimationFrame(() => {
            frameId = null;
            const currentState = softPageBreakPluginKey.getState(view.state);
            const next = buildSoftPageBreakDecorations(view);

            if (currentState?.signature === next.signature) {
                return;
            }

            view.dispatch(view.state.tr.setMeta(softPageBreakPluginKey, next));
        });
    }

    schedule();

    return {
        schedule,
        destroy() {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
        },
    };
}

export const SoftPageBreakExtension = Extension.create({
    name: 'softPageBreaks',

    addProseMirrorPlugins() {
        return [
            new Plugin<SoftPageBreakState>({
                key: softPageBreakPluginKey,
                state: {
                    init: (_, state) => ({
                        decorations: DecorationSet.empty,
                        signature: `empty:${state.doc.content.size}`,
                    }),
                    apply: (tr, value) => {
                        const meta = tr.getMeta(softPageBreakPluginKey) as SoftPageBreakMeta | undefined;
                        if (meta) {
                            return meta;
                        }

                        if (!tr.docChanged) {
                            return value;
                        }

                        return {
                            ...value,
                            decorations: value.decorations.map(tr.mapping, tr.doc),
                        };
                    },
                },
                props: {
                    decorations(state) {
                        return softPageBreakPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
                    },
                },
                view(view) {
                    const measurement = scheduleSoftPageBreakMeasure(view);
                    const resizeObserver = new ResizeObserver(measurement.schedule);
                    resizeObserver.observe(view.dom);

                    const paperEl = view.dom.closest('.document-paper-sheet');
                    if (paperEl instanceof HTMLElement) {
                        resizeObserver.observe(paperEl);
                    }

                    window.addEventListener('resize', measurement.schedule);

                    return {
                        update() {
                            measurement.schedule();
                        },
                        destroy() {
                            resizeObserver.disconnect();
                            window.removeEventListener('resize', measurement.schedule);
                            measurement.destroy();
                        },
                    };
                },
            }),
        ];
    },
});
