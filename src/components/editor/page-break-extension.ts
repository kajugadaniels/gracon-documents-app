'use client';

import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        pageBreak: {
            insertPageBreak: () => ReturnType;
        };
    }
}

export const PageBreakExtension = Node.create({
    name: 'pageBreak',

    group: 'block',

    atom: true,

    selectable: true,

    parseHTML() {
        return [
            { tag: 'div[data-type="page-break"]' },
            { tag: 'div[data-page-break="true"]' },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'page-break',
                'data-page-break': 'true',
                class: 'document-page-break',
            }),
            ['span', { class: 'document-page-break__label' }, 'Page break'],
        ];
    },

    addCommands() {
        return {
            insertPageBreak: () => ({ chain }) => (
                chain()
                    .insertContent({ type: this.name })
                    .createParagraphNear()
                    .run()
            ),
        };
    },

    addKeyboardShortcuts() {
        return {
            'Mod-Enter': () => this.editor.commands.insertPageBreak(),
        };
    },
});
