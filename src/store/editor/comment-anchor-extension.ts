import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface CommentAnchorInput {
    id: string;
    anchorText: string | null;
    anchorFrom: number | null;
    anchorTo: number | null;
    resolvedAt: string | null;
    active?: boolean;
}

interface CommentAnchorRange {
    id: string;
    from: number;
    to: number;
    resolved: boolean;
    active: boolean;
}

export const commentAnchorPluginKey = new PluginKey<CommentAnchorInput[]>('commentAnchors');

function normalizeText(value: string) {
    return value.replace(/\s+/g, ' ').trim();
}

function isValidStoredRange(doc: ProseMirrorNode, anchor: CommentAnchorInput) {
    if (
        !Number.isInteger(anchor.anchorFrom) ||
        !Number.isInteger(anchor.anchorTo) ||
        anchor.anchorFrom === null ||
        anchor.anchorTo === null ||
        anchor.anchorFrom >= anchor.anchorTo ||
        anchor.anchorFrom < 0 ||
        anchor.anchorTo > doc.content.size
    ) {
        return false;
    }

    if (!anchor.anchorText) {
        return true;
    }

    const rangeText = normalizeText(
        doc.textBetween(anchor.anchorFrom, anchor.anchorTo, ' '),
    );
    const anchorText = normalizeText(anchor.anchorText);
    return rangeText === anchorText || rangeText.includes(anchorText);
}

function findAnchorTextRange(doc: ProseMirrorNode, anchorText: string) {
    const target = normalizeText(anchorText);
    if (!target) return null;

    let found: { from: number; to: number } | null = null;
    doc.descendants((node, pos) => {
        if (found || !node.isText || !node.text) return !found;

        const text = normalizeText(node.text);
        const index = text.indexOf(target);
        if (index < 0) return true;

        found = {
            from: pos + index,
            to: pos + index + target.length,
        };
        return false;
    });

    return found;
}

export function resolveCommentAnchorRange(
    doc: ProseMirrorNode,
    anchor: CommentAnchorInput,
) {
    if (isValidStoredRange(doc, anchor)) {
        return {
            from: anchor.anchorFrom!,
            to: anchor.anchorTo!,
        };
    }

    return anchor.anchorText ? findAnchorTextRange(doc, anchor.anchorText) : null;
}

function getAnchorRanges(doc: ProseMirrorNode, anchors: CommentAnchorInput[]) {
    return anchors
        .filter((anchor) => !anchor.resolvedAt)
        .map((anchor): CommentAnchorRange | null => {
            const range = resolveCommentAnchorRange(doc, anchor);
            if (!range || range.from >= range.to) return null;
            return {
                id: anchor.id,
                from: range.from,
                to: range.to,
                resolved: Boolean(anchor.resolvedAt),
                active: Boolean(anchor.active),
            };
        })
        .filter((range): range is CommentAnchorRange => Boolean(range));
}

function buildDecorations(doc: ProseMirrorNode, anchors: CommentAnchorInput[]) {
    const decorations = getAnchorRanges(doc, anchors).map((range) =>
        Decoration.inline(range.from, range.to, {
            class: `tiptap-comment-anchor${range.active ? ' tiptap-comment-anchor--active' : ''}`,
            'data-comment-id': range.id,
        }),
    );

    return DecorationSet.create(doc, decorations);
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        commentAnchor: {
            setCommentAnchors: (anchors: CommentAnchorInput[]) => ReturnType;
            focusCommentAnchor: (anchor: CommentAnchorInput) => ReturnType;
        };
    }
}

export const CommentAnchorExtension = Extension.create({
    name: 'commentAnchor',

    addCommands() {
        return {
            setCommentAnchors:
                (anchors: CommentAnchorInput[]) =>
                ({ tr, dispatch }) => {
                    dispatch?.(tr.setMeta(commentAnchorPluginKey, anchors));
                    return true;
                },
            focusCommentAnchor:
                (anchor: CommentAnchorInput) =>
                ({ editor }) => {
                    const range = resolveCommentAnchorRange(editor.state.doc, anchor);
                    if (!range) return false;

                    editor.commands.setTextSelection(range);
                    editor.view.dispatch(editor.state.tr.scrollIntoView());
                    editor.view.focus();
                    return true;
                },
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin<CommentAnchorInput[]>({
                key: commentAnchorPluginKey,
                state: {
                    init: () => [],
                    apply: (tr, value) => {
                        const nextAnchors = tr.getMeta(commentAnchorPluginKey) as CommentAnchorInput[] | undefined;
                        return nextAnchors ?? value;
                    },
                },
                props: {
                    decorations(state) {
                        return buildDecorations(
                            state.doc,
                            commentAnchorPluginKey.getState(state) ?? [],
                        );
                    },
                },
            }),
        ];
    },
});

export function focusCommentAnchor(editor: Editor | null, anchor: CommentAnchorInput) {
    if (!editor) return false;
    return editor.commands.focusCommentAnchor(anchor);
}
