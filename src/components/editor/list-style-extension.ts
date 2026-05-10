import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model';
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

function collectActiveListPositions(editor: Editor, typeName: 'bulletList' | 'orderedList') {
    const { state } = editor;
    const { selection } = state;
    const positions = new Map<number, ProseMirrorNode>();

    function addAncestorLists($pos: ResolvedPos) {
        for (let depth = $pos.depth; depth > 0; depth -= 1) {
            const node = $pos.node(depth);
            if (node.type.name === typeName) {
                positions.set($pos.before(depth), node);
            }
        }
    }

    addAncestorLists(selection.$from);
    addAncestorLists(selection.$to);

    state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
        if (node.type.name === typeName) {
            positions.set(pos, node);
        }
    });

    return positions;
}

function updateSelectedListStyles(
    editor: Editor,
    typeName: 'bulletList' | 'orderedList',
    listStyleType: BulletListStyle | OrderedListStyle,
) {
    const positions = collectActiveListPositions(editor, typeName);

    if (positions.size === 0) {
        return false;
    }

    let tr = editor.state.tr;
    let changed = false;

    positions.forEach((node, pos) => {
        if (node.attrs.listStyleType === listStyleType) {
            return;
        }

        tr = tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            listStyleType,
        }, node.marks);
        changed = true;
    });

    if (changed) {
        editor.view.dispatch(tr);
    }

    return true;
}

export function setBulletListStyle(editor: Editor, style: BulletListStyle) {
    const listStyleType = normalizeBulletListStyle(style);

    if (editor.isActive('bulletList')) {
        return updateSelectedListStyles(editor, 'bulletList', listStyleType);
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
        return updateSelectedListStyles(editor, 'orderedList', listStyleType);
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
