'use client';

// Isolated read-only TipTap renderer for paginated print preview experiments.
import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { BackgroundColor, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { PaginationPlus } from 'tiptap-pagination-plus';
import type { RefObject } from 'react';
import { CommentAnchorExtension } from '@/store/editor/comment-anchor-extension';
import { ImportedDocxStyleExtension } from '@/store/editor/imported-docx-style-extension';
import { ListStyleExtension } from '@/store/editor/list-style-extension';
import { ParagraphLayoutExtension } from '@/store/editor/paragraph-layout-extension';
import { ResizableImageExtension } from '@/store/editor/resizable-image-extension';
import { SignatureBlockExtension } from '@/store/editor/signature-block-extension';
import { StyledTableCell, StyledTableHeader } from '@/store/editor/table-cell-style-extension';
import { A4_PAPER_WIDTH_PX } from '@/constants/document-paper';
import type { DocumentLayout } from '@/lib/document-layout';
import { normalizeEditorLinkUrl } from '@/lib/editor-link';
import { buildPrintPreviewPaginationConfig } from '@/lib/print-preview-pagination';
import { removeDocumentBoundariesFromTiptapContent } from '@/lib/remove-document-boundaries';

export type PaginatedPrintPreviewRenderMode = 'preview' | 'export';

export interface PaginatedPrintPreviewCanvasProps {
    canvasRef: RefObject<HTMLDivElement | null>;
    documentId: string;
    title: string;
    status: string;
    content: Record<string, unknown> | null;
    layout: DocumentLayout;
    zoomScale: number;
    pageGap: number;
    renderMode?: PaginatedPrintPreviewRenderMode;
    bottomOverlay?: ReactNode;
    onReady?: () => void;
    onPreviewError?: (error: Error) => void;
}

/**
 * Read-only TipTap renderer used only inside the print preview dialog.
 */
export function PaginatedPrintPreviewCanvas({
    canvasRef,
    documentId,
    title,
    status,
    content,
    layout,
    zoomScale,
    pageGap,
    renderMode = 'preview',
    bottomOverlay,
    onReady,
    onPreviewError,
}: PaginatedPrintPreviewCanvasProps) {
    const sanitizedContent = useMemo(
        () => removeDocumentBoundariesFromTiptapContent(content)
            ?? { type: 'doc', content: [{ type: 'paragraph' }] },
        [content],
    );
    const paginationConfig = useMemo(
        () => buildPrintPreviewPaginationConfig({ layout, title, status, pageGap }),
        [layout, pageGap, status, title],
    );
    const scaledFrameWidth = Math.round(A4_PAPER_WIDTH_PX * zoomScale);

    const editor = useEditor({
        immediatelyRender: false,
        editable: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4, 5, 6] },
                codeBlock: { languageClassPrefix: 'language-' },
                link: false,
                dropcursor: false,
            }),
            TextStyle,
            Color,
            BackgroundColor,
            FontFamily,
            FontSize,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Table.configure({ resizable: false }),
            TableRow,
            StyledTableHeader,
            StyledTableCell,
            Highlight.configure({ multicolor: true }),
            ResizableImageExtension.configure({
                allowBase64: false,
                inline: false,
                minWidth: 96,
                maxWidth: 720,
                HTMLAttributes: {
                    loading: 'lazy',
                    decoding: 'async',
                },
            }),
            Link.configure({
                openOnClick: false,
                autolink: false,
                linkOnPaste: false,
                isAllowedUri: (url) => normalizeEditorLinkUrl(url ?? '').ok,
                HTMLAttributes: {
                    target: '_blank',
                    rel: 'noopener noreferrer nofollow',
                },
            }),
            CommentAnchorExtension,
            ListStyleExtension,
            ParagraphLayoutExtension,
            ImportedDocxStyleExtension,
            SignatureBlockExtension,
            PaginationPlus.configure(paginationConfig),
        ],
        content: sanitizedContent,
    }, [documentId]);

    useEffect(() => {
        if (!editor) return;

        try {
            editor.commands.updatePageHeight(paginationConfig.pageHeight);
            editor.commands.updatePageWidth(paginationConfig.pageWidth);
            editor.commands.updatePageGap(paginationConfig.pageGap);
            editor.commands.updatePageBreakBackground(paginationConfig.pageBreakBackground);
            editor.commands.updateMargins({
                top: paginationConfig.marginTop,
                right: paginationConfig.marginRight,
                bottom: paginationConfig.marginBottom,
                left: paginationConfig.marginLeft,
            });
            editor.commands.updateContentMargins({
                top: paginationConfig.contentMarginTop,
                bottom: paginationConfig.contentMarginBottom,
            });
            editor.commands.updateHeaderContent(
                paginationConfig.headerLeft,
                paginationConfig.headerRight,
            );
            editor.commands.updateFooterContent(
                paginationConfig.footerLeft,
                paginationConfig.footerRight,
            );
        } catch (error) {
            onPreviewError?.(
                error instanceof Error
                    ? error
                    : new Error('Failed to update paginated print preview layout.'),
            );
        }
    }, [editor, onPreviewError, paginationConfig]);

    useEffect(() => {
        if (!editor) return;
        try {
            editor.commands.setContent(sanitizedContent, { emitUpdate: false });
            onReady?.();
        } catch (error) {
            onPreviewError?.(
                error instanceof Error
                    ? error
                    : new Error('Failed to render paginated print preview content.'),
            );
        }
    }, [editor, onPreviewError, onReady, sanitizedContent]);

    return (
        <div
            ref={canvasRef}
            className={`ded-canvas paginated-print-preview paginated-print-preview--${renderMode}`}
            data-paginated-print-export-root={renderMode === 'export' ? 'true' : undefined}
        >
            <div
                className="paginated-print-preview__shell"
                style={{ width: scaledFrameWidth }}
            >
                <div
                    className="paginated-print-preview__frame"
                    style={{
                        width: A4_PAPER_WIDTH_PX,
                        transform: `scale(${zoomScale})`,
                        transformOrigin: 'top center',
                        position: 'relative',
                    }}
                >
                    <div className="tiptap-editor tiptap-editor-paper paginated-print-preview__editor">
                        {editor ? (
                            <EditorContent editor={editor} />
                        ) : (
                            <div className="paginated-print-preview__loading">
                                Preparing preview...
                            </div>
                        )}
                    </div>
                    {bottomOverlay}
                </div>
            </div>
        </div>
    );
}
