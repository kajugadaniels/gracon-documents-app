import { Extension } from '@tiptap/core';
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
            setBulletListStyle: (style) => ({ commands, editor }) => {
                const listStyleType = normalizeBulletListStyle(style);

                if (!editor.isActive('bulletList') && !commands.toggleBulletList()) {
                    return false;
                }

                return commands.updateAttributes('bulletList', { listStyleType });
            },
            setOrderedListStyle: (style) => ({ commands, editor }) => {
                const listStyleType = normalizeOrderedListStyle(style);

                if (!editor.isActive('orderedList') && !commands.toggleOrderedList()) {
                    return false;
                }

                return commands.updateAttributes('orderedList', { listStyleType });
            },
            toggleBulletListStyle: (style = DEFAULT_BULLET_LIST_STYLE) => ({ commands, editor }) => {
                const listStyleType = normalizeBulletListStyle(style);

                if (
                    editor.isActive('bulletList') &&
                    normalizeBulletListStyle(editor.getAttributes('bulletList').listStyleType) === listStyleType
                ) {
                    return commands.toggleBulletList();
                }

                return editor.commands.setBulletListStyle(listStyleType);
            },
            toggleOrderedListStyle: (style = DEFAULT_ORDERED_LIST_STYLE) => ({ commands, editor }) => {
                const listStyleType = normalizeOrderedListStyle(style);

                if (
                    editor.isActive('orderedList') &&
                    normalizeOrderedListStyle(editor.getAttributes('orderedList').listStyleType) === listStyleType
                ) {
                    return commands.toggleOrderedList();
                }

                return editor.commands.setOrderedListStyle(listStyleType);
            },
        };
    },
});
