/**
 * Shared document paper geometry used by the editor and client-side exports.
 *
 * Keep these values aligned with the CSS custom properties in globals.css.
 * The pixel dimensions use the browser's 96 DPI CSS inch conversion.
 */
export const DOCUMENT_PAPER_DPI = 96;

export const A4_PAPER_WIDTH_PX = 794;
export const A4_PAPER_HEIGHT_PX = 1123;
export const A4_PAPER_MARGIN_PX = DOCUMENT_PAPER_DPI;

export const A4_PAPER_WIDTH_PT = 595.28;
export const A4_PAPER_HEIGHT_PT = 841.89;

export const A4_PAPER_WIDTH_TWIP = 11906;
export const A4_PAPER_HEIGHT_TWIP = 16838;

export const A4_PAPER_ASPECT_RATIO = A4_PAPER_HEIGHT_PX / A4_PAPER_WIDTH_PX;
