/**
 * page-break-extension.ts
 *
 * TipTap node extension for document page breaks.
 *
 * Renders as a transparent, non-editable spacer whose height is calculated
 * to push subsequent content to the start of the next page's content zone.
 * The CSS repeating-gradient on the paginated canvas supplies the visual
 * gray gap — this node provides only the vertical spacing.
 *
 * Two sub-types:
 *   auto   — inserted by the auto-pagination algorithm; never persisted.
 *   manual — inserted by the user (Ctrl/Cmd+Enter or Insert menu); saved.
 */

import { Node, mergeAttributes } from '@tiptap/core';

/** Page geometry constants — must match PaginatedEditorCanvas. */
export const PAGE_HEIGHT   = 1056; // px — 11" at 96 dpi
export const PAGE_GAP      = 24;   // px — gap between sheets
export const PAGE_CYCLE    = PAGE_HEIGHT + PAGE_GAP; // 1080
export const TOP_MARGIN    = 96;   // px — 1"
export const BOTTOM_MARGIN = 96;   // px — 1"
/** Y offset (mod PAGE_CYCLE) where content should stop and wrap to the next page. */
export const CONTENT_END   = PAGE_HEIGHT - BOTTOM_MARGIN; // 960

/**
 * Computes the spacer height required to push a block whose top is at
 * `blockTop` (relative to the ProseMirror root) to the start of the next
 * page's content zone.
 */
export function spacerForBlock(blockTop: number): number {
    const posInCycle = blockTop % PAGE_CYCLE;
    return PAGE_CYCLE - posInCycle + TOP_MARGIN;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        pageBreak: {
            /** Inserts a page-break spacer. Pass auto=true for algorithm-placed breaks. */
            insertPageBreak: (spacerHeight: number, auto?: boolean) => ReturnType;
        };
    }
}

export const PageBreakExtension = Node.create({
    name: 'pageBreak',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: false,

    addAttributes() {
        return {
            spacerHeight: { default: TOP_MARGIN },
            auto:         { default: false },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-page-break]' }];
    },

    renderHTML({ HTMLAttributes }) {
        const isAuto = HTMLAttributes.auto as boolean;
        return ['div', mergeAttributes(HTMLAttributes, {
            'data-page-break': isAuto ? 'auto' : 'manual',
            class: `ded-page-break${isAuto ? '' : ' ded-page-break--manual'}`,
            style: `height:${HTMLAttributes.spacerHeight as number}px`,
            contenteditable: 'false',
        })];
    },

    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement('div');
            dom.dataset.pageBreak = (node.attrs.auto as boolean) ? 'auto' : 'manual';
            dom.className = `ded-page-break${(node.attrs.auto as boolean) ? '' : ' ded-page-break--manual'}`;
            dom.style.height = `${node.attrs.spacerHeight as number}px`;
            dom.contentEditable = 'false';

            if (!(node.attrs.auto as boolean)) {
                const label = document.createElement('div');
                label.className = 'ded-page-break__label';
                label.textContent = 'Page break';
                dom.appendChild(label);
            }

            return { dom };
        };
    },

    addCommands() {
        return {
            insertPageBreak:
                (spacerHeight: number, auto = false) =>
                ({ chain }) =>
                    chain()
                        .insertContent({ type: this.name, attrs: { spacerHeight, auto } })
                        .run(),
        };
    },
});
