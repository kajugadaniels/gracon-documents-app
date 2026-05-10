import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import {
    DEFAULT_BULLET_LIST_STYLE,
    DEFAULT_ORDERED_LIST_STYLE,
    normalizeBulletListStyle,
    normalizeOrderedListStyle,
    type BulletListStyle,
    type OrderedListStyle,
} from '@/constants';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        listStyle: {
            setBulletListStyle: (style: BulletListStyle) => ReturnType;
            setOrderedListStyle: (style: OrderedListStyle) => ReturnType;
            toggleBulletListStyle: (style?: BulletListStyle) => ReturnType;
            toggleOrderedListStyle: (style?: OrderedListStyle) => ReturnType;
        };
    }
}

function parseListStyleType(element: HTMLElement) {
    return element.getAttribute('data-list-style-type') || element.style.listStyleType;
}

function renderListStyleType(style: string) {
    return {
        'data-list-style-type': style,
        style: `list-style-type: ${style};`,
    };
}

export function setBulletListStyle(editor: Editor, style: BulletListStyle) {
    const listStyleType = normalizeBulletListStyle(style);

    if (editor.isActive('bulletList')) {
        return editor.chain().focus().updateAttributes('bulletList', { listStyleType }).run();
    }

    return editor.chain()
        .focus()
        .toggleBulletList()
        .updateAttributes('bulletList', { listStyleType })
        .run();
}

export function setOrderedListStyle(editor: Editor, style: OrderedListStyle) {
    const listStyleType = normalizeOrderedListStyle(style);

    if (editor.isActive('orderedList')) {
        return editor.chain().focus().updateAttributes('orderedList', { listStyleType }).run();
    }

    return editor.chain()
        .focus()
        .toggleOrderedList()
        .updateAttributes('orderedList', { listStyleType })
        .run();
}

export function toggleBulletListStyle(editor: Editor, style: BulletListStyle = DEFAULT_BULLET_LIST_STYLE) {
    const listStyleType = normalizeBulletListStyle(style);

    if (
        editor.isActive('bulletList') &&
        normalizeBulletListStyle(editor.getAttributes('bulletList').listStyleType) === listStyleType
    ) {
        return editor.chain().focus().toggleBulletList().run();
    }

    return setBulletListStyle(editor, listStyleType);
}

export function toggleOrderedListStyle(editor: Editor, style: OrderedListStyle = DEFAULT_ORDERED_LIST_STYLE) {
    const listStyleType = normalizeOrderedListStyle(style);

    if (
        editor.isActive('orderedList') &&
        normalizeOrderedListStyle(editor.getAttributes('orderedList').listStyleType) === listStyleType
    ) {
        return editor.chain().focus().toggleOrderedList().run();
    }

    return setOrderedListStyle(editor, listStyleType);
}

export const ListStyleExtension = Extension.create({
    name: 'listStyle',

    addGlobalAttributes() {
        return [
            {
                types: ['bulletList'],
                attributes: {
                    listStyleType: {
                        default: DEFAULT_BULLET_LIST_STYLE,
                        parseHTML: (element) => normalizeBulletListStyle(parseListStyleType(element)),
                        renderHTML: (attributes) => {
                            const style = normalizeBulletListStyle(attributes.listStyleType);
                            return renderListStyleType(style);
                        },
                    },
                },
            },
            {
                types: ['orderedList'],
                attributes: {
                    listStyleType: {
                        default: DEFAULT_ORDERED_LIST_STYLE,
                        parseHTML: (element) => normalizeOrderedListStyle(parseListStyleType(element)),
                        renderHTML: (attributes) => {
                            const style = normalizeOrderedListStyle(attributes.listStyleType);
                            return renderListStyleType(style);
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            setBulletListStyle: (style) => ({ editor }) => setBulletListStyle(editor, style),
            setOrderedListStyle: (style) => ({ editor }) => setOrderedListStyle(editor, style),
            toggleBulletListStyle: (style = DEFAULT_BULLET_LIST_STYLE) => ({ editor }) => toggleBulletListStyle(editor, style),
            toggleOrderedListStyle: (style = DEFAULT_ORDERED_LIST_STYLE) => ({ editor }) => toggleOrderedListStyle(editor, style),
        };
    },
});
