import type { PaginationPlusOptions } from 'tiptap-pagination-plus';
import {
    A4_PAPER_HEIGHT_PX,
    A4_PAPER_WIDTH_PX,
    PAPER_PAGE_GAP_PX,
} from '../constants/document-paper.ts';

export interface PrintPreviewDocumentLayout {
    paperSize: 'A4';
    margins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    headerFooter: {
        headerEnabled: boolean;
        footerEnabled: boolean;
        pageNumbersEnabled: boolean;
        headerText: string;
        footerText: string;
    };
}

function toSafePixel(value: number, fallback = 0) {
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getFallbackFooter(status: string) {
    return `${status.toLowerCase()} document`;
}

/**
 * Maps the app document layout to the isolated print-preview pagination config.
 */
export function buildPrintPreviewPaginationConfig({
    layout,
    title,
    status,
    pageGap = PAPER_PAGE_GAP_PX,
}: {
    layout: PrintPreviewDocumentLayout;
    title: string;
    status: string;
    pageGap?: number;
}): PaginationPlusOptions {
    const headerText = escapeHtml(layout.headerFooter.headerText || title);
    const footerText = escapeHtml(layout.headerFooter.footerText || getFallbackFooter(status));
    const pageNumber = 'Page {page}';
    const showHeaderPageNumber = layout.headerFooter.headerEnabled &&
        layout.headerFooter.pageNumbersEnabled;
    const showFooterPageNumber = layout.headerFooter.footerEnabled &&
        layout.headerFooter.pageNumbersEnabled;

    return {
        enabled: true,
        pageHeight: A4_PAPER_HEIGHT_PX,
        pageWidth: A4_PAPER_WIDTH_PX,
        marginTop: toSafePixel(layout.margins.top),
        marginBottom: toSafePixel(layout.margins.bottom),
        marginLeft: toSafePixel(layout.margins.left),
        marginRight: toSafePixel(layout.margins.right),
        contentMarginTop: layout.headerFooter.headerEnabled ? 8 : 0,
        contentMarginBottom: layout.headerFooter.footerEnabled ? 8 : 0,
        pageGap: toSafePixel(pageGap, PAPER_PAGE_GAP_PX),
        pageGapBorderSize: 1,
        pageGapBorderColor: 'rgba(22,16,58,0.12)',
        pageBreakBackground: '#e5e7eb',
        headerLeft: layout.headerFooter.headerEnabled ? headerText : '',
        headerRight: showHeaderPageNumber ? pageNumber : '',
        footerLeft: layout.headerFooter.footerEnabled ? footerText : '',
        footerRight: showFooterPageNumber ? pageNumber : '',
        customHeader: {},
        customFooter: {},
    };
}
