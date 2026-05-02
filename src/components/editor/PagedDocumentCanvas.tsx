'use client';

import type { RefObject, ReactNode } from 'react';
import type { CSSProperties } from 'react';
import type { Editor } from '@tiptap/react';
import type { CommentAnchorInput } from './comment-anchor-extension';
import { RichTextEditor } from './RichTextEditor';
import { DocumentPageGuides } from './DocumentPageGuides';
import { buildPagedDocumentModel } from '@/lib/paged-document-model';

interface PagedDocumentCanvasProps {
    canvasRef: RefObject<HTMLDivElement | null>;
    documentId: string;
    title: string;
    status: string;
    content: Record<string, unknown> | null;
    isReadOnly: boolean;
    zoomScale: number;
    pageCount: number;
    pageHeight: number;
    contentHeight: number;
    printLayout: boolean;
    showFormattingMarks: boolean;
    paperStyle: CSSProperties;
    overlayContent?: ReactNode;
    commentAnchors: CommentAnchorInput[];
    onContentChange?: (content: Record<string, unknown>, wordCount: number) => void;
    onEditorReady: (editor: Editor) => void;
}

function getFrameClassName(printLayout: boolean, showFormattingMarks: boolean) {
    return [
        'document-layout-frame',
        !printLayout ? 'document-layout-frame--web-layout' : '',
        showFormattingMarks ? 'document-layout-frame--show-marks' : '',
    ].filter(Boolean).join(' ');
}

export function PagedDocumentCanvas({
    canvasRef,
    documentId,
    title,
    status,
    content,
    isReadOnly,
    zoomScale,
    pageCount,
    pageHeight,
    contentHeight,
    printLayout,
    showFormattingMarks,
    paperStyle,
    overlayContent,
    commentAnchors,
    onContentChange,
    onEditorReady,
}: PagedDocumentCanvasProps) {
    const pageModel = buildPagedDocumentModel({ pageCount, pageHeight, contentHeight });
    const scaledFrameWidth = Math.round(pageModel.pageWidth * zoomScale);
    const scaledFrameHeight = pageModel.totalHeight * zoomScale;

    return (
        <div ref={canvasRef} className="ded-canvas">
            <div className="document-workspace-stage" data-page-count={pageModel.pages.length}>
                <div
                    className="document-layout-shell"
                    style={{ width: scaledFrameWidth, minHeight: scaledFrameHeight }}
                >
                    <div
                        className={getFrameClassName(printLayout, showFormattingMarks)}
                        style={{
                            transform: `scale(${zoomScale})`,
                            transformOrigin: 'top center',
                        }}
                    >
                        <RichTextEditor
                            key={documentId}
                            initialContent={content}
                            onContentChange={isReadOnly ? undefined : onContentChange}
                            onEditorReady={onEditorReady}
                            hideToolbar
                            readOnly={isReadOnly}
                            paperMode
                            paperTitle={title}
                            paperStatus={status}
                            pageNumber={1}
                            pageCount={pageModel.pages.length}
                            paperStyle={paperStyle}
                            overlayContent={overlayContent}
                            commentAnchors={commentAnchors}
                        />
                        {printLayout && <DocumentPageGuides pages={pageModel.pages} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
