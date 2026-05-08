/**
 * Shared recognition for editor nodes that represent page boundaries in export.
 *
 * Page boundaries are intentionally disabled in the continuous TipTap editor.
 * Keeping this pure lets regression tests verify that legacy markers no longer
 * become DOCX page breaks.
 */

/**
 * Returns whether a rendered editor block should become a DOCX page boundary.
 */
export function isDocumentPageBoundaryElement(_element: { classList: Pick<DOMTokenList, 'contains'> }): boolean {
    return false;
}
