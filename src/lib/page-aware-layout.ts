export interface PageAwareBlockInput {
    offsetTop: number;
    blockHeight: number;
    pageHeight: number;
    oversizedThreshold?: number;
}

export interface PageAwareBlockDecision {
    offset: number;
    oversized: boolean;
    crossesPage: boolean;
}

const PAGE_TOP_TOLERANCE_PX = 1;

export function getPageAwareBlockDecision({
    offsetTop,
    blockHeight,
    pageHeight,
    oversizedThreshold = pageHeight,
}: PageAwareBlockInput): PageAwareBlockDecision {
    if (offsetTop < 0 || blockHeight <= 0 || pageHeight <= 0) {
        return { offset: 0, oversized: false, crossesPage: false };
    }

    const pageRemainder = offsetTop % pageHeight;
    const remainingHeight = pageHeight - pageRemainder;
    const oversized = blockHeight > oversizedThreshold;
    const startsAtPageTop = pageRemainder <= PAGE_TOP_TOLERANCE_PX;
    const crossesPage = blockHeight > remainingHeight && !startsAtPageTop;

    return {
        offset: crossesPage && !oversized ? remainingHeight : 0,
        oversized,
        crossesPage,
    };
}
