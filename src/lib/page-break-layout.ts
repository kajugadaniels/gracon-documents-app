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

function positiveNumber(value: number, fallback = 0) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
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
    const currentPageIndex = Math.max(
        0,
        Math.floor((safeBreakTop - safeContentTopInset) / safePagePitch),
    );
    const nextPageContentTop = ((currentPageIndex + 1) * safePagePitch) + safeContentTopInset;
    const desiredBreakHeight = nextPageContentTop - safeBreakTop - safeBreakMarginBottom;

    return Math.max(0, Math.ceil(Math.max(safeBreakMinHeight, desiredBreakHeight)));
}
