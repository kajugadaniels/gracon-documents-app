/**
 * DOCS_NAV_ITEMS
 *
 * Navigation tab entries for the documents section header (DocsHeader).
 * Each item has an isActive predicate that is evaluated against the current
 * pathname and optional status query parameter to highlight the active tab.
 */

/** Shape of a single documents-section navigation tab. */
export interface DocsNavItem {
    href: string;
    label: string;
    /** Short description shown as a tooltip on the tab. */
    description: string;
    /** Returns true when this tab should be highlighted as active. */
    isActive: (pathname: string, status: string | null) => boolean;
}

export const DOCS_NAV_ITEMS: DocsNavItem[] = [
    {
        href: '/documents',
        label: 'My documents',
        description: 'Everything you are drafting right now',
        isActive: (pathname, status) =>
            pathname.startsWith('/documents') && status !== 'LOCKED',
    },
    {
        href: '/templates',
        label: 'Templates',
        description: 'Reusable foundations for repeat work',
        isActive: (pathname) => pathname.startsWith('/templates'),
    },
    {
        href: '/documents?status=LOCKED',
        label: 'Signed',
        description: 'Completed and sealed records',
        isActive: (pathname, status) =>
            pathname === '/documents' && status === 'LOCKED',
    },
];
