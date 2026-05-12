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
import { A4_PAPER_WIDTH_PX } from '@/constants';
import {
    DEFAULT_DOCUMENT_LAYOUT,
    normalizeParagraphTabStops,
    type ParagraphTabStop,
} from '@/lib/document-layout';

export interface ActiveParagraphLayout {
    nodeType: 'paragraph' | 'heading';
    leftIndent: number;
    firstLineIndent: number;
    tabStops: ParagraphTabStop[];
    blockCount: number;
    hasMixedLeftIndent: boolean;
    hasMixedFirstLineIndent: boolean;
    hasMixedTabStops: boolean;
}

function normalizeIndent(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
}

function normalizeTabStops(value: unknown) {
    return normalizeParagraphTabStops(
        A4_PAPER_WIDTH_PX,
        DEFAULT_DOCUMENT_LAYOUT.margins,
        value,
    );
}

function sameTabStops(left: ParagraphTabStop[], right: ParagraphTabStop[]) {
    return left.length === right.length && left.every((value, index) => (
        value.position === right[index].position &&
        value.align === right[index].align
    ));
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
            tabStops: normalizeTabStops(node.attrs.tabStops),
            blockCount: 1,
            hasMixedLeftIndent: false,
            hasMixedFirstLineIndent: false,
            hasMixedTabStops: false,
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
            hasMixedTabStops: blocks.some((block) => !sameTabStops(block.tabStops, first.tabStops)),
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
            tabStops: normalizeTabStops(node.attrs.tabStops),
            blockCount: 1,
            hasMixedLeftIndent: false,
            hasMixedFirstLineIndent: false,
            hasMixedTabStops: false,
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
