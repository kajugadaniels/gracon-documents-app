/**
 * Pure geometry helpers for paginated preview PDF export.
 */
import { A4_PAPER_HEIGHT_PX } from '../constants/document-paper.ts';

export interface PaginatedPageOffsetInput {
    scrollHeight: number;
    gapEndOffsets: number[];
    pageHeight?: number;
}

export interface PaginatedSnapshotSliceInput {
    snapshotHeight: number;
    cssSnapshotHeight: number;
    pageHeight?: number;
}

/**
 * Returns the CSS top offsets used to capture each rendered paginated preview page.
 */
export function createPaginatedPageStartOffsets({
    scrollHeight,
    gapEndOffsets,
    pageHeight = A4_PAPER_HEIGHT_PX,
}: PaginatedPageOffsetInput) {
    const safePageHeight = Math.max(Math.round(pageHeight), 1);
    const safeScrollHeight = Math.max(Math.round(scrollHeight), safePageHeight);
    const maxScrollableTop = Math.max(safeScrollHeight - safePageHeight, 0);
    const starts = [
        0,
        ...gapEndOffsets
            .filter((offset) => Number.isFinite(offset))
            .map((offset) => Math.round(offset)),
    ];

    return starts
        .map((start) => Math.min(Math.max(start, 0), maxScrollableTop))
        .filter((start, index, source) => index === 0 || start > source[index - 1]);
}

/**
 * Converts a CSS page height into the corresponding snapshot canvas pixel height.
 */
export function getPaginatedSnapshotPageHeightPixels({
    snapshotHeight,
    cssSnapshotHeight,
    pageHeight = A4_PAPER_HEIGHT_PX,
}: PaginatedSnapshotSliceInput) {
    const safeSnapshotHeight = Math.max(Math.round(snapshotHeight), 1);
    const safeCssSnapshotHeight = Math.max(Math.round(cssSnapshotHeight), 1);
    const safePageHeight = Math.max(Math.round(pageHeight), 1);
    const pixelsPerCssPixel = safeSnapshotHeight / safeCssSnapshotHeight;

    return Math.max(Math.round(safePageHeight * pixelsPerCssPixel), 1);
}
