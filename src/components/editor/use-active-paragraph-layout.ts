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
}

function normalizeIndent(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
}

/**
 * Reads the closest paragraph-like block from the current selection.
 */
function readActiveParagraphLayout(editor: Editor | null): ActiveParagraphLayout | null {
    if (!editor) return null;

    const { selection } = editor.state;

    for (let depth = selection.$from.depth; depth >= 0; depth -= 1) {
        const node = selection.$from.node(depth);

        if (node.type.name !== 'paragraph' && node.type.name !== 'heading') {
            continue;
        }

        return {
            nodeType: node.type.name,
            leftIndent: normalizeIndent(node.attrs.leftIndent),
            firstLineIndent: normalizeIndent(node.attrs.firstLineIndent),
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
