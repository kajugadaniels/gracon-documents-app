'use client';

import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        sectionBreak: {
            insertSectionBreak: () => ReturnType;
        };
    }
}

export const SectionBreakExtension = Node.create({
    name: 'sectionBreak',

    group: 'block',

    atom: true,

    selectable: true,

    parseHTML() {
        return [
            { tag: 'div[data-type="section-break"]' },
            { tag: 'div[data-section-break="true"]' },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'section-break',
                'data-section-break': 'true',
                class: 'document-section-break',
            }),
            ['span', { class: 'document-section-break__label' }, 'Section break'],
        ];
    },

    addCommands() {
        return {
            insertSectionBreak: () => ({ chain }) => (
                chain()
                    .insertContent({ type: this.name })
                    .createParagraphNear()
                    .run()
            ),
        };
    },
});
