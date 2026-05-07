'use client';

import type { RefObject, ReactNode } from 'react';
import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import type { CommentAnchorInput } from './comment-anchor-extension';
import { RichTextEditor } from './RichTextEditor';
import { DocumentPageGuides } from './DocumentPageGuides';
import { PAPER_PAGE_GAP_PX } from '@/constants/document-paper';
import { buildPagedDocumentModel } from '@/lib/paged-document-model';
import type { PagedDocumentPage } from '@/lib/paged-document-model';
import type { DocumentHeaderFooter } from '@/lib/document-layout';
import { getPageAwareBlockDecision } from '@/lib/page-aware-layout';

const EDITOR_PAGE_GAP_PX = PAPER_PAGE_GAP_PX;

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
    headerFooter: DocumentHeaderFooter;
    showRepeatedPageChrome?: boolean;
    pageGap?: number;
    overlayContent?: ReactNode;
    commentAnchors: CommentAnchorInput[];
    onContentChange?: (content: Record<string, unknown>, wordCount: number) => void;
    onEditorReady: (editor: Editor) => void;
}

function getFrameClassName(printLayout: boolean, showFormattingMarks: boolean) {
    return [
        'document-layout-frame',
        printLayout ? 'document-layout-frame--paged' : '',
        !printLayout ? 'document-layout-frame--web-layout' : '',
        showFormattingMarks ? 'document-layout-frame--show-marks' : '',
    ].filter(Boolean).join(' ');
}

function PagedPaperSurfaces({
    pages,
    title,
    status,
    headerFooter,
    showPageChrome,
    pageGap,
}: {
    pages: PagedDocumentPage[];
    title: string;
    status: string;
    headerFooter: DocumentHeaderFooter;
    showPageChrome: boolean;
    pageGap: number;
}) {
    const headerText = headerFooter.headerText || title;
    const footerText = headerFooter.footerText || `${status.toLowerCase()} document`;

    return (
        <div className="document-page-surfaces" aria-hidden="true">
            {pages.map((page) => (
                <section
                    key={page.pageNumber}
                    className="document-page-surface"
                    style={{
                        top: page.top + ((page.pageNumber - 1) * pageGap),
                        height: page.height,
                    }}
                >
                    <header
                        className={[
                            'document-page-surface__header',
                            (!showPageChrome || !headerFooter.headerEnabled) ? 'document-page-surface__chrome--hidden' : '',
                        ].filter(Boolean).join(' ')}
                    >
                            <span className="document-page-surface__title">{headerText}</span>
                            {headerFooter.pageNumbersEnabled && (
                                <span className="document-page-surface__tag">Page {page.pageNumber}</span>
                            )}
                    </header>
                    <footer
                        className={[
                            'document-page-surface__footer',
                            (!showPageChrome || !headerFooter.footerEnabled) ? 'document-page-surface__chrome--hidden' : '',
                        ].filter(Boolean).join(' ')}
                    >
                            <span>{footerText}</span>
                            {headerFooter.pageNumbersEnabled && (
                                <span>Page {page.pageNumber} of {pages.length}</span>
                            )}
                    </footer>
                </section>
            ))}
        </div>
    );
}

function applyMeasuredPageBreaks(rootEl: HTMLElement, pageHeight: number, pageGap: number) {
    const breaks = Array.from(
        rootEl.querySelectorAll<HTMLElement>('.document-page-break, .document-section-break'),
    );
    const pagePitch = pageHeight + pageGap;

    breaks.forEach((breakEl) => {
        breakEl.style.setProperty('--document-page-break-spacer', '0px');
    });

    breaks.forEach((breakEl) => {
        const offsetTop = breakEl.offsetTop;
        const remainder = offsetTop % pagePitch;
        const spacerHeight = remainder <= 1 ? 0 : pagePitch - remainder;

        breakEl.style.setProperty('--document-page-break-spacer', `${spacerHeight}px`);
    });
}

function getPrintableBlockThreshold(rootEl: HTMLElement, pageHeight: number) {
    const styles = window.getComputedStyle(rootEl);
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
    return Math.max(pageHeight - paddingTop - paddingBottom, pageHeight * 0.6);
}

function getPageAwareBlocks(rootEl: HTMLElement) {
    const blocks = Array.from(rootEl.querySelectorAll<HTMLElement>([
        '[data-resize-container][data-node="image"]',
        'img',
        '.tableWrapper',
        'table',
    ].join(',')));

    return blocks.filter((block) => {
        const resizeContainer = block.closest('[data-resize-container][data-node="image"]');
        const tableWrapper = block.closest('.tableWrapper');
        if (resizeContainer && resizeContainer !== block) return false;
        if (tableWrapper && tableWrapper !== block && block.tagName === 'TABLE') return false;
        return true;
    });
}

function resetPageAwareBlock(block: HTMLElement) {
    block.classList.add('document-page-aware-block');
    block.classList.remove(
        'document-page-aware-block--push-next',
        'document-page-aware-block--oversized',
    );
    block.style.setProperty('--document-page-aware-offset', '0px');
    block.removeAttribute('data-page-warning');
}

function applyPageAwareBlocks(rootEl: HTMLElement, pageHeight: number, pageGap: number) {
    const blocks = getPageAwareBlocks(rootEl);
    const oversizedThreshold = getPrintableBlockThreshold(rootEl, pageHeight);
    const pagePitch = pageHeight + pageGap;

    blocks.forEach(resetPageAwareBlock);
    blocks.forEach((block) => {
        const decision = getPageAwareBlockDecision({
            offsetTop: block.offsetTop,
            blockHeight: block.offsetHeight,
            pageHeight: pagePitch,
            oversizedThreshold,
        });

        if (decision.offset > 0) {
            block.classList.add('document-page-aware-block--push-next');
            block.style.setProperty('--document-page-aware-offset', `${decision.offset}px`);
        }

        if (decision.oversized) {
            block.classList.add('document-page-aware-block--oversized');
            block.setAttribute('data-page-warning', 'Too large for one page');
        }
    });
}

function clearPageAwareBlocks(rootEl: HTMLElement) {
    getPageAwareBlocks(rootEl).forEach((block) => {
        block.classList.remove(
            'document-page-aware-block',
            'document-page-aware-block--push-next',
            'document-page-aware-block--oversized',
        );
        block.style.removeProperty('--document-page-aware-offset');
        block.removeAttribute('data-page-warning');
    });
}

function getFlowGapBlocks(rootEl: HTMLElement) {
    return Array.from(rootEl.children).filter((child): child is HTMLElement => {
        if (!(child instanceof HTMLElement)) return false;
        return !child.classList.contains('document-page-break') &&
            !child.classList.contains('document-section-break');
    });
}

function resetFlowGapBlock(block: HTMLElement) {
    block.classList.remove('document-flow-page-gap--push');
    block.style.removeProperty('--document-flow-page-gap-offset');
}

function applyFlowPageGaps(rootEl: HTMLElement, pageHeight: number, pageGap: number) {
    const blocks = getFlowGapBlocks(rootEl);
    blocks.forEach(resetFlowGapBlock);
    if (pageGap <= 0 || pageHeight <= 0) return;

    blocks.forEach((block) => {
        const offsetTop = block.offsetTop;
        let pageIndex = Math.max(1, Math.floor(offsetTop / (pageHeight + pageGap)) + 1);
        let pageEnd = (pageIndex * pageHeight) + ((pageIndex - 1) * pageGap);

        while (offsetTop >= pageEnd + pageGap) {
            pageIndex += 1;
            pageEnd = (pageIndex * pageHeight) + ((pageIndex - 1) * pageGap);
        }

        const blockBottom = offsetTop + block.offsetHeight;
        const startsInGap = offsetTop > pageEnd && offsetTop < pageEnd + pageGap;
        const crossesIntoGap = offsetTop < pageEnd && blockBottom > pageEnd;

        if (!startsInGap && !crossesIntoGap) return;

        const offset = Math.max(Math.ceil(pageEnd + pageGap - offsetTop), 0);
        if (offset === 0) return;

        block.classList.add('document-flow-page-gap--push');
        block.style.setProperty('--document-flow-page-gap-offset', `${offset}px`);
    });
}

function clearFlowPageGaps(rootEl: HTMLElement) {
    getFlowGapBlocks(rootEl).forEach(resetFlowGapBlock);
}

function usePagedFlowMeasurement(
    canvasRef: RefObject<HTMLDivElement | null>,
    pageHeight: number,
    printLayout: boolean,
    pageGap: number,
) {
    useEffect(() => {
        const canvasEl = canvasRef.current;
        if (!canvasEl || !printLayout) return;

        const editorEl = canvasEl.querySelector<HTMLElement>('.ProseMirror');
        if (!editorEl) return;
        const measuredEditorEl = editorEl;

        let frameId: number | null = null;

        function scheduleMeasure() {
            if (frameId !== null) window.cancelAnimationFrame(frameId);
            frameId = window.requestAnimationFrame(() => {
                frameId = null;
                applyMeasuredPageBreaks(measuredEditorEl, pageHeight, pageGap);
                applyPageAwareBlocks(measuredEditorEl, pageHeight, pageGap);
                applyFlowPageGaps(measuredEditorEl, pageHeight, pageGap);
            });
        }

        const resizeObserver = new ResizeObserver(scheduleMeasure);
        resizeObserver.observe(measuredEditorEl);
        measuredEditorEl.querySelectorAll('.document-page-break, .document-section-break').forEach((node) => {
            if (node instanceof HTMLElement) resizeObserver.observe(node);
        });
        getPageAwareBlocks(measuredEditorEl).forEach((node) => {
            resizeObserver.observe(node);
        });

        const mutationObserver = new MutationObserver(scheduleMeasure);
        mutationObserver.observe(measuredEditorEl, { childList: true, subtree: true });

        scheduleMeasure();

        return () => {
            if (frameId !== null) window.cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            clearPageAwareBlocks(measuredEditorEl);
            clearFlowPageGaps(measuredEditorEl);
        };
    }, [canvasRef, pageGap, pageHeight, printLayout]);
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
    headerFooter,
    showRepeatedPageChrome = false,
    pageGap = EDITOR_PAGE_GAP_PX,
    overlayContent,
    commentAnchors,
    onContentChange,
    onEditorReady,
}: PagedDocumentCanvasProps) {
    const pageModel = buildPagedDocumentModel({ pageCount, pageHeight, contentHeight });
    const scaledFrameWidth = Math.round(pageModel.pageWidth * zoomScale);
    const visualPageGap = printLayout ? pageGap : 0;
    const visualFrameHeight = pageModel.visualHeight + ((pageModel.pages.length - 1) * visualPageGap);
    const scaledFrameHeight = visualFrameHeight * zoomScale;
    const headerText = headerFooter.headerText || title;
    const footerText = headerFooter.footerText || `${status.toLowerCase()} document`;
    usePagedFlowMeasurement(canvasRef, pageModel.pageHeight, printLayout, visualPageGap);

    return (
        <div ref={canvasRef} className="ded-canvas">
            <div className="document-workspace-stage" data-page-count={pageModel.pages.length}>
                <div
                    className="document-layout-shell"
                    style={{ width: scaledFrameWidth, minHeight: scaledFrameHeight }}
                >
                    <div
                        className={getFrameClassName(printLayout, showFormattingMarks)}
                        data-document-export-root="true"
                        data-document-page-count={pageModel.pages.length}
                        data-document-page-height={pageModel.pageHeight}
                        data-document-title={title}
                        data-document-status={status}
                        data-document-header-enabled={String(headerFooter.headerEnabled)}
                        data-document-footer-enabled={String(headerFooter.footerEnabled)}
                        data-document-page-numbers-enabled={String(headerFooter.pageNumbersEnabled)}
                        data-document-header-text={headerText}
                        data-document-footer-text={footerText}
                        data-document-page-gap={visualPageGap}
                        style={{
                            minHeight: pageModel.visualHeight,
                            ['--document-page-gap' as string]: `${visualPageGap}px`,
                            ['--ded-tiptap-min-height' as string]: `${visualFrameHeight}px`,
                            transform: `scale(${zoomScale})`,
                            transformOrigin: 'top center',
                        }}
                    >
                        {printLayout && (
                            <PagedPaperSurfaces
                                pages={pageModel.pages}
                                title={title}
                                status={status}
                                headerFooter={headerFooter}
                                showPageChrome={showRepeatedPageChrome}
                                pageGap={visualPageGap}
                            />
                        )}
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
                        {printLayout && (
                            <DocumentPageGuides
                                pages={pageModel.pages}
                                pageGap={visualPageGap}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
