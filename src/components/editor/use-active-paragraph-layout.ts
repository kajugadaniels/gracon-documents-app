'use client';

/**
 * Tracks paragraph indentation for the current TipTap selection.
 *
 * This powers the ruler readout layer so the top ruler can reflect the
 * active block's left-indent and first-line-indent values before those
 * markers become draggable.
 */
import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

export interface ActiveParagraphLayout {
    nodeType: 'paragraph' | 'heading';
    leftIndent: number;
    firstLineIndent: number;
    blockCount: number;
    hasMixedLeftIndent: boolean;
    hasMixedFirstLineIndent: boolean;
}

function normalizeIndent(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
}

/**
 * Reads selected paragraph-like blocks and returns ruler-safe aggregate state.
 */
function readActiveParagraphLayout(editor: Editor | null): ActiveParagraphLayout | null {
    if (!editor) return null;

    const { selection } = editor.state;
    const blocks: ActiveParagraphLayout[] = [];

    editor.state.doc.nodesBetween(selection.from, selection.to, (node) => {
        if (node.type.name !== 'paragraph' && node.type.name !== 'heading') {
            return;
        }

        blocks.push({
            nodeType: node.type.name,
            leftIndent: normalizeIndent(node.attrs.leftIndent),
            firstLineIndent: normalizeIndent(node.attrs.firstLineIndent),
            blockCount: 1,
            hasMixedLeftIndent: false,
            hasMixedFirstLineIndent: false,
        });
    });

    if (blocks.length > 0) {
        const first = blocks[0];

        return {
            ...first,
            blockCount: blocks.length,
            nodeType: blocks.some((block) => block.nodeType !== first.nodeType) ? 'paragraph' : first.nodeType,
            hasMixedLeftIndent: blocks.some((block) => block.leftIndent !== first.leftIndent),
            hasMixedFirstLineIndent: blocks.some((block) => block.firstLineIndent !== first.firstLineIndent),
        };
    }

    for (let depth = selection.$from.depth; depth >= 0; depth -= 1) {
        const node = selection.$from.node(depth);

        if (node.type.name !== 'paragraph' && node.type.name !== 'heading') {
            continue;
        }

        return {
            nodeType: node.type.name,
            leftIndent: normalizeIndent(node.attrs.leftIndent),
            firstLineIndent: normalizeIndent(node.attrs.firstLineIndent),
            blockCount: 1,
            hasMixedLeftIndent: false,
            hasMixedFirstLineIndent: false,
        };
    }

    return null;
}

/**
 * Subscribes to editor updates and exposes the active paragraph indent state.
 */
export function useActiveParagraphLayout(editor: Editor | null) {
    const [layout, setLayout] = useState<ActiveParagraphLayout | null>(null);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const update = () => {
            setLayout(readActiveParagraphLayout(editor));
        };

        queueMicrotask(update);
        editor.on('selectionUpdate', update);
        editor.on('transaction', update);

        return () => {
            editor.off('selectionUpdate', update);
            editor.off('transaction', update);
        };
    }, [editor]);

    useEffect(() => {
        if (editor) return;

        queueMicrotask(() => {
            setLayout(null);
        });
    }, [editor]);

    return layout;
}
