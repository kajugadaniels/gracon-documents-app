/**
 * Shared recognition for editor nodes that represent page boundaries in export.
 *
 * Keeping this pure lets regression tests verify page-break semantics without
 * loading the browser-only DOCX export module.
 */

/**
 * Returns whether a rendered editor block should become a DOCX page boundary.
 *
 * Manual page breaks and section breaks have different editor styling, but both
 * must remain semantic page boundaries in exported documents.
 */
export function isDocumentPageBoundaryElement(element: { classList: Pick<DOMTokenList, 'contains'> }): boolean {
    return (
        element.classList.contains('document-page-break') ||
        element.classList.contains('document-section-break')
    );
}
