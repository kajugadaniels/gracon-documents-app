'use client';

/**
 * TipTap extension for persisted paragraph indentation attributes.
 *
 * The ruler needs stable paragraph layout data in the document schema so
 * selection-aware indent markers can be read consistently now and edited
 * directly in later steps without relying on fragile DOM inspection.
 */
import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        paragraphLayout: {
            /**
             * Applies paragraph indentation attrs to selected paragraphs/headings.
             */
            setParagraphIndentation: (attrs: {
                leftIndent: number;
                firstLineIndent: number;
            }) => ReturnType;
        };
    }
}

function normalizeIndent(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
}

function parseIndentFromStyle(styleValue: string | null) {
    if (!styleValue) return 0;
    const parsed = Number.parseFloat(styleValue);
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

export const ParagraphLayoutExtension = Extension.create({
    name: 'paragraphLayout',

    addCommands() {
        return {
            setParagraphIndentation: (attrs) => ({ state, dispatch }) => {
                const nextLeftIndent = normalizeIndent(attrs.leftIndent);
                const nextFirstLineIndent = normalizeIndent(attrs.firstLineIndent);
                let tr = state.tr;
                let changed = false;
                let appliedCount = 0;

                state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
                    if (node.type.name !== 'paragraph' && node.type.name !== 'heading') {
                        return;
                    }

                    appliedCount += 1;

                    if (
                        normalizeIndent(node.attrs.leftIndent) === nextLeftIndent &&
                        normalizeIndent(node.attrs.firstLineIndent) === nextFirstLineIndent
                    ) {
                        return;
                    }

                    tr = tr.setNodeMarkup(pos, undefined, {
                        ...node.attrs,
                        leftIndent: nextLeftIndent,
                        firstLineIndent: nextFirstLineIndent,
                    });
                    changed = true;
                });

                // Collapsed selections do not always surface through nodesBetween,
                // so fall back to the closest paragraph-like ancestor.
                if (appliedCount === 0) {
                    const { $from } = state.selection;

                    for (let depth = $from.depth; depth >= 0; depth -= 1) {
                        const node = $from.node(depth);

                        if (node.type.name !== 'paragraph' && node.type.name !== 'heading') {
                            continue;
                        }

                        if (
                            normalizeIndent(node.attrs.leftIndent) === nextLeftIndent &&
                            normalizeIndent(node.attrs.firstLineIndent) === nextFirstLineIndent
                        ) {
                            break;
                        }

                        tr = tr.setNodeMarkup($from.before(depth), undefined, {
                            ...node.attrs,
                            leftIndent: nextLeftIndent,
                            firstLineIndent: nextFirstLineIndent,
                        });
                        changed = true;
                        break;
                    }
                }

                if (!changed) {
                    return true;
                }

                if (dispatch) {
                    dispatch(tr);
                }

                return true;
            },
        };
    },

    addGlobalAttributes() {
        return [
            {
                types: ['paragraph', 'heading'],
                attributes: {
                    leftIndent: {
                        default: 0,
                        parseHTML: (element) => {
                            const attr = element.getAttribute('data-left-indent');
                            if (attr) {
                                return normalizeIndent(Number.parseFloat(attr));
                            }

                            return parseIndentFromStyle(element.style.marginLeft);
                        },
                        renderHTML: (attributes) => {
                            const leftIndent = normalizeIndent(attributes.leftIndent);
                            const firstLineIndent = normalizeIndent(attributes.firstLineIndent);
                            const styleParts: string[] = [];

                            if (leftIndent) {
                                styleParts.push(`margin-left: ${leftIndent}px`);
                            }

                            if (firstLineIndent) {
                                styleParts.push(`text-indent: ${firstLineIndent}px`);
                            }

                            if (!leftIndent && !firstLineIndent) {
                                return {};
                            }

                            return {
                                'data-left-indent': String(leftIndent),
                                style: styleParts.join('; '),
                            };
                        },
                    },
                    firstLineIndent: {
                        default: 0,
                        parseHTML: (element) => {
                            const attr = element.getAttribute('data-first-line-indent');
                            if (attr) {
                                return normalizeIndent(Number.parseFloat(attr));
                            }

                            return parseIndentFromStyle(element.style.textIndent);
                        },
                        renderHTML: (attributes) => {
                            const firstLineIndent = normalizeIndent(attributes.firstLineIndent);

                            if (!firstLineIndent) {
                                return {};
                            }

                            return {
                                'data-first-line-indent': String(firstLineIndent),
                            };
                        },
                    },
                },
            },
        ];
    },
});
