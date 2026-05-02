const DEFAULT_PAGE_WIDTH = 794;
const DEFAULT_PAGE_HEIGHT = 1123;

export interface PagedDocumentPage {
    pageNumber: number;
    top: number;
    height: number;
}

export interface PagedDocumentModel {
    pages: PagedDocumentPage[];
    pageWidth: number;
    pageHeight: number;
    contentHeight: number;
    totalHeight: number;
    visualHeight: number;
}

export interface PagedDocumentModelInput {
    pageCount: number;
    pageHeight: number;
    contentHeight: number;
    pageWidth?: number;
}

function positiveNumber(value: number, fallback: number) {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

export function buildPagedDocumentModel(input: PagedDocumentModelInput): PagedDocumentModel {
    const pageWidth = positiveNumber(input.pageWidth ?? DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_WIDTH);
    const pageHeight = positiveNumber(input.pageHeight, DEFAULT_PAGE_HEIGHT);
    const pageCount = Math.max(1, Math.ceil(input.pageCount));
    const contentHeight = positiveNumber(input.contentHeight, pageHeight);
    const totalHeight = Math.max(contentHeight, pageHeight * pageCount);
    const pages = Array.from({ length: pageCount }, (_, index) => ({
        pageNumber: index + 1,
        top: index * pageHeight,
        height: pageHeight,
    }));

    return {
        pages,
        pageWidth,
        pageHeight,
        contentHeight,
        totalHeight,
        visualHeight: pageHeight * pageCount,
    };
}
