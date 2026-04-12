/**
 * find-in-document
 *
 * Utility for locating text occurrences inside a TipTap / ProseMirror document.
 * Walks the document tree and returns every character-position range that matches
 * the given query string (case-insensitive). Used by EditorFindBar.
 */
import type { Editor } from '@tiptap/react';

/** A single text match expressed as a ProseMirror position range. */
export interface FindMatch {
    from: number;
    to: number;
}

/**
 * Walks the ProseMirror document and returns every position range where the
 * query string appears (case-insensitive). Returns an empty array when the
 * query is blank or no matches exist.
 *
 * @param editor - The active TipTap editor instance.
 * @param query  - The search string (matched case-insensitively).
 */
export function collectMatches(editor: Editor, query: string): FindMatch[] {
    const lower = query.toLowerCase();
    const results: FindMatch[] = [];
    editor.state.doc.descendants((node, pos) => {
        if (!node.isText || !node.text) return;
        const text = node.text.toLowerCase();
        let idx = text.indexOf(lower);
        while (idx !== -1) {
            results.push({ from: pos + idx, to: pos + idx + query.length });
            idx = text.indexOf(lower, idx + 1);
        }
    });
    return results;
}
