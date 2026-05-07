/**
 * Pure pagination helpers for placing manual page breaks in the rendered editor.
 *
 * These helpers keep page-break geometry testable without touching the TipTap
 * document model, which protects autosave, hashes, comments, and export paths.
 */
export interface PageBreakSpacerInput {
    breakTop: number;
    pageHeight: number;
    pageGap: number;
    contentTopInset: number;
    breakMinHeight: number;
    breakMarginBottom: number;
}

export interface PageBreakPageIndexInput {
    breakTop: number;
    pageHeight: number;
    pageGap: number;
    contentTopInset: number;
}

export interface PageBreakControlPositionInput {
    breakTop: number;
    pageIndex: number;
    pageHeight: number;
    pageGap: number;
    spacerHeight: number;
}

function positiveNumber(value: number, fallback = 0) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Returns the zero-based page index that owns a manual page-break node.
 *
 * The content inset is subtracted so page breaks in the visual page gap still
 * belong to the page that precedes them.
 */
export function getManualPageBreakPageIndex({
    breakTop,
    pageHeight,
    pageGap,
    contentTopInset,
}: PageBreakPageIndexInput): number {
    const safePageHeight = positiveNumber(pageHeight, 1);
    const safePageGap = Math.max(0, pageGap);
    const safePagePitch = safePageHeight + safePageGap;
    const safeContentTopInset = Math.max(0, contentTopInset);
    const safeBreakTop = Math.max(0, breakTop);

    return Math.max(
        0,
        Math.floor((safeBreakTop - safeContentTopInset) / safePagePitch),
    );
}

/**
 * Calculates the vertical offset for the visible page-break control.
 *
 * The control prefers the center of the inter-page gap but is clamped inside
 * the page-break node so short spacers still keep a visible, selectable marker.
 */
export function getManualPageBreakControlTop({
    breakTop,
    pageIndex,
    pageHeight,
    pageGap,
    spacerHeight,
}: PageBreakControlPositionInput): number {
    const safePageHeight = positiveNumber(pageHeight, 1);
    const safePageGap = Math.max(0, pageGap);
    const safePagePitch = safePageHeight + safePageGap;
    const safeBreakTop = Math.max(0, breakTop);
    const safePageIndex = Math.max(0, Math.floor(pageIndex));
    const safeSpacerHeight = Math.max(0, spacerHeight);
    const pageGapCenter = (safePageIndex * safePagePitch) + safePageHeight + (safePageGap / 2);
    const minControlTop = 24;
    const maxControlTop = Math.max(safeSpacerHeight - minControlTop, minControlTop);

    return Math.round(Math.min(
        Math.max(pageGapCenter - safeBreakTop, minControlTop),
        maxControlTop,
    ));
}

/**
 * Calculates the CSS height value needed for a manual page-break node.
 *
 * The next editable block should start at the following page's content inset,
 * not at the raw page edge. The returned value is intended for
 * `--document-page-break-spacer`; CSS min-height can still keep the marker
 * visible when the computed spacing is small.
 */
export function getManualPageBreakSpacerHeight({
    breakTop,
    pageHeight,
    pageGap,
    contentTopInset,
    breakMinHeight,
    breakMarginBottom,
}: PageBreakSpacerInput): number {
    const safePageHeight = positiveNumber(pageHeight, 1);
    const safePageGap = Math.max(0, pageGap);
    const safePagePitch = safePageHeight + safePageGap;
    const safeContentTopInset = Math.max(0, contentTopInset);
    const safeBreakTop = Math.max(0, breakTop);
    const safeBreakMinHeight = Math.max(0, breakMinHeight);
    const safeBreakMarginBottom = Math.max(0, breakMarginBottom);
    const currentPageIndex = getManualPageBreakPageIndex({
        breakTop,
        pageHeight,
        pageGap,
        contentTopInset,
    });
    const nextPageContentTop = ((currentPageIndex + 1) * safePagePitch) + safeContentTopInset;
    const desiredBreakHeight = nextPageContentTop - safeBreakTop - safeBreakMarginBottom;

    return Math.max(0, Math.ceil(Math.max(safeBreakMinHeight, desiredBreakHeight)));
}
