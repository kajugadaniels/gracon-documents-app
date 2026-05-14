import type { PaginationPlusOptions } from 'tiptap-pagination-plus';

const A4_PAPER_WIDTH_PX = 794;
const A4_PAPER_HEIGHT_PX = 1123;
const PAPER_PAGE_GAP_PX = 24;

interface PrintPreviewDocumentLayout {
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
        marginTop: layout.margins.top,
        marginBottom: layout.margins.bottom,
        marginLeft: layout.margins.left,
        marginRight: layout.margins.right,
        contentMarginTop: layout.headerFooter.headerEnabled ? 8 : 0,
        contentMarginBottom: layout.headerFooter.footerEnabled ? 8 : 0,
        pageGap,
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
