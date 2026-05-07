/**
 * Pure helpers for visual-only automatic page flow spacing.
 *
 * These calculations keep rendered editor content out of page chrome and page
 * gaps without inserting saved page-break nodes into the TipTap document.
 */
export interface PageFlowBlockOffsetInput {
    offsetTop: number;
    blockHeight: number;
    pageHeight: number;
    pageGap: number;
    contentTopInset: number;
    contentBottomInset: number;
}

function positiveNumber(value: number, fallback = 0) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Calculates a top margin offset for a rendered block near an automatic page
 * boundary. Blocks that begin in the page gap or top chrome are pushed to the
 * next page's writable content top; blocks that collide with the bottom chrome
 * are moved to the following page when possible.
 */
export function getAutomaticPageFlowBlockOffset({
    offsetTop,
    blockHeight,
    pageHeight,
    pageGap,
    contentTopInset,
    contentBottomInset,
}: PageFlowBlockOffsetInput): number {
    const safeOffsetTop = Math.max(0, offsetTop);
    const safeBlockHeight = Math.max(0, blockHeight);
    const safePageHeight = positiveNumber(pageHeight, 1);
    const safePageGap = Math.max(0, pageGap);
    const safePagePitch = safePageHeight + safePageGap;
    const safeContentTopInset = Math.max(0, contentTopInset);
    const safeContentBottomInset = Math.max(0, contentBottomInset);
    const pageIndex = Math.max(0, Math.floor(safeOffsetTop / safePagePitch));
    const pageTop = pageIndex * safePagePitch;
    const contentTop = pageTop + safeContentTopInset;
    const contentBottom = pageTop + safePageHeight - safeContentBottomInset;
    const nextContentTop = ((pageIndex + 1) * safePagePitch) + safeContentTopInset;
    const startsBeforeWritableArea = safeOffsetTop > pageTop && safeOffsetTop < contentTop;

    if (startsBeforeWritableArea) {
        return Math.ceil(contentTop - safeOffsetTop);
    }

    const startsInPageGap = safeOffsetTop >= pageTop + safePageHeight && safeOffsetTop < pageTop + safePagePitch;
    if (startsInPageGap) {
        return Math.ceil(nextContentTop - safeOffsetTop);
    }

    const blockBottom = safeOffsetTop + safeBlockHeight;
    const crossesBottomChrome = safeOffsetTop < contentBottom && blockBottom > contentBottom;
    const fitsNextPage = safeBlockHeight <= Math.max(0, safePageHeight - safeContentTopInset - safeContentBottomInset);

    if (crossesBottomChrome && fitsNextPage) {
        return Math.ceil(nextContentTop - safeOffsetTop);
    }

    return 0;
}
