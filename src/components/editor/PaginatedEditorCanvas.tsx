/**
 * PaginatedEditorCanvas
 *
 * Google Docs-style multi-page A4 canvas around a single TipTap editor.
 *
 * Visual pages are drawn by a CSS repeating-gradient on the paper wrapper
 * (816 × 1056px sheets, 24px gray gaps). Content flows through one
 * continuous editor instance — pagination is achieved by inserting
 * transparent PageBreak spacer nodes that push content to the next page.
 *
 * Auto page breaks are inserted by scanning block positions after each
 * content update (debounced 500ms). They are stripped from the content
 * before autosave so they are never persisted to the server.
 *
 * Manual page breaks (Ctrl/Cmd+Enter or Insert › Page break) are saved.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { RichTextEditor } from './RichTextEditor';
import type { CommentAnchorInput } from './comment-anchor-extension';
import {
    PAGE_CYCLE, PAGE_HEIGHT, TOP_MARGIN, CONTENT_END, spacerForBlock,
} from './page-break-extension';

// ── Auto-pagination helpers ───────────────────────────────────────────────────

/**
 * Meta key set on all pagination-internal transactions so the update
 * listener can ignore them and avoid infinite repagination loops.
 */
const PAGINATION_META = 'paginationOp';

/** Remove all auto pageBreak nodes in a single tagged transaction. */
function removeAutoBreaks(editor: Editor): void {
    const positions: number[] = [];
    editor.state.doc.forEach((node, pos) => {
        if (node.type.name === 'pageBreak' && (node.attrs.auto as boolean)) {
            positions.push(pos);
        }
    });
    if (positions.length === 0) return;

    const tr = editor.state.tr.setMeta(PAGINATION_META, true);
    for (let i = positions.length - 1; i >= 0; i--) {
        const node = editor.state.doc.nodeAt(positions[i]);
        if (node) tr.delete(positions[i], positions[i] + node.nodeSize);
    }
    editor.view.dispatch(tr);
}

/**
 * Scan top-level blocks. For every block whose top falls inside the bottom
 * margin or page gap, insert an auto pageBreak spacer before it.
 * The transaction is tagged so the update listener ignores it.
 */
function insertAutoBreaks(editor: Editor): void {
    const insertions: Array<{ pos: number; height: number }> = [];

    editor.state.doc.forEach((node, pos) => {
        if (node.type.name === 'pageBreak') return;
        try {
            const domNode = editor.view.nodeDOM(pos);
            if (!(domNode instanceof HTMLElement)) return;
            const posInCycle = domNode.offsetTop % PAGE_CYCLE;
            if (posInCycle >= CONTENT_END) {
                insertions.push({ pos, height: spacerForBlock(domNode.offsetTop) });
            }
        } catch {
            // nodeDOM throws on unmounted or decorating nodes — safe to skip
        }
    });

    if (insertions.length === 0) return;

    const tr = editor.state.tr.setMeta(PAGINATION_META, true);
    for (let i = insertions.length - 1; i >= 0; i--) {
        const { pos, height } = insertions[i];
        const breakNode = editor.schema.nodes.pageBreak.create({ spacerHeight: height, auto: true });
        tr.insert(pos, breakNode);
    }
    editor.view.dispatch(tr);
}

// ── Content filter (strip auto breaks before autosave) ────────────────────────

type DocNode = { type: string; attrs?: Record<string, unknown>; content?: DocNode[] };

/** Recursively removes auto pageBreak nodes so they are never persisted. */
function filterAutoBreaks(content: Record<string, unknown>): Record<string, unknown> {
    const doc = content as DocNode;
    if (!Array.isArray(doc.content)) return content;
    return {
        ...content,
        content: doc.content.filter(
            (n) => !(n.type === 'pageBreak' && n.attrs?.auto === true),
        ),
    };
}

// ── getCursorBlockTop ─────────────────────────────────────────────────────────

/**
 * Returns the offsetTop (relative to .ProseMirror) of the top-level block
 * containing the current cursor, used to compute manual page-break spacers.
 */
function getCursorBlockTop(editor: Editor): number {
    const { from } = editor.state.selection;
    const domPos = editor.view.domAtPos(from);
    let node: globalThis.Node | null =
        domPos.node instanceof Text ? domPos.node.parentNode : domPos.node;
    const prosemirror = editor.view.dom;
    while (node && node.parentNode !== prosemirror) node = node.parentNode;
    return node instanceof HTMLElement ? node.offsetTop : 0;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PaginatedEditorCanvasProps {
    documentId: string;
    initialContent?: Record<string, unknown> | null;
    onContentChange?: (content: Record<string, unknown>, wordCount: number) => void;
    onEditorReady?: (editor: Editor) => void;
    readOnly?: boolean;
    overlayContent?: ReactNode;
    commentAnchors?: CommentAnchorInput[];
}

/** Google Docs-style paginated A4 canvas. Wraps a single TipTap editor instance. */
export function PaginatedEditorCanvas({
    documentId,
    initialContent,
    onContentChange,
    onEditorReady,
    readOnly = false,
    overlayContent,
    commentAnchors = [],
}: PaginatedEditorCanvasProps) {
    const [editor, setEditor] = useState<Editor | null>(null);
    const [pageCount, setPageCount] = useState(1);
    // Guards against re-triggering repagination while a pagination transaction is in flight.
    const paginatingRef = useRef(false);

    // ── Lift editor instance up ───────────────────────────────────────────────

    const handleEditorReady = useCallback((e: Editor) => {
        setEditor(e);
        onEditorReady?.(e);
    }, [onEditorReady]);

    // ── Strip auto breaks from saved content ──────────────────────────────────

    const handleContentChange = useCallback(
        (content: Record<string, unknown>, wordCount: number) => {
            onContentChange?.(filterAutoBreaks(content), wordCount);
        },
        [onContentChange],
    );

    // ── Track page count from editor height ───────────────────────────────────

    useEffect(() => {
        if (!editor) return;
        const el = editor.view.dom as HTMLElement;
        const observer = new ResizeObserver(() => {
            setPageCount(Math.max(1, Math.ceil(el.offsetHeight / PAGE_CYCLE)));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [editor]);

    // ── Auto pagination ───────────────────────────────────────────────────────

    useEffect(() => {
        if (!editor || readOnly) return;
        let timer: ReturnType<typeof setTimeout> | null = null;

        /** Remove stale auto breaks, then re-insert after the DOM settles. */
        function repaginate() {
            if (!editor || paginatingRef.current) return;
            paginatingRef.current = true;
            removeAutoBreaks(editor);
            requestAnimationFrame(() => {
                if (editor) insertAutoBreaks(editor);
                paginatingRef.current = false;
            });
        }

        function schedule(props: { transaction: { getMeta: (k: string) => unknown } }) {
            // Ignore transactions dispatched by the pagination algorithm itself
            // to prevent an infinite update → repaginate → update loop.
            if (props.transaction.getMeta(PAGINATION_META)) return;
            if (timer) clearTimeout(timer);
            timer = setTimeout(repaginate, 500);
        }

        editor.on('update', schedule);
        requestAnimationFrame(repaginate); // initial pagination on mount

        return () => {
            editor.off('update', schedule);
            if (timer) clearTimeout(timer);
        };
    }, [editor, readOnly]);

    // ── Ctrl/Cmd+Enter → manual page break ───────────────────────────────────

    useEffect(() => {
        if (!editor || readOnly) return;
        const dom = editor.view.dom;

        function onKeydown(e: KeyboardEvent) {
            if (!(e.ctrlKey || e.metaKey) || e.key !== 'Enter') return;
            e.preventDefault();
            const top = getCursorBlockTop(editor!);
            editor!.commands.insertPageBreak(spacerForBlock(top), false);
        }

        dom.addEventListener('keydown', onKeydown);
        return () => dom.removeEventListener('keydown', onKeydown);
    }, [editor, readOnly]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="ded-paginated-canvas">
            <div className="ded-paginated-stage">

                {/* Left-margin page numbers */}
                <div className="ded-paginated-numbers" aria-hidden="true">
                    {Array.from({ length: pageCount }, (_, i) => (
                        <div
                            key={i}
                            className="ded-paginated-number"
                            style={{ top: Math.round(PAGE_HEIGHT / 2) + i * PAGE_CYCLE }}
                        >
                            {i + 1}
                        </div>
                    ))}
                </div>

                {/* Paper — CSS gradient draws page sheets + gaps */}
                <div className="ded-paginated-paper">
                    {overlayContent && (
                        <div className="ded-paginated-overlay" aria-hidden="true">
                            {overlayContent}
                        </div>
                    )}
                    <RichTextEditor
                        key={documentId}
                        initialContent={initialContent}
                        onContentChange={handleContentChange}
                        onEditorReady={handleEditorReady}
                        hideToolbar
                        readOnly={readOnly}
                        paginatedMode
                        commentAnchors={commentAnchors}
                    />
                </div>

            </div>
        </div>
    );
}
