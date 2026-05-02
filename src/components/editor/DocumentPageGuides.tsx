/**
 * Non-interactive page markers for the measured document layout.
 * These guides are visual only and are not exported or saved.
 */
'use client';

import type { DocumentPaginationPage } from './use-document-pagination';

interface DocumentPageGuidesProps {
    pages: DocumentPaginationPage[];
    pageGap?: number;
}

/**
 * Renders subtle page labels at measured A4 boundaries.
 */
export function DocumentPageGuides({ pages, pageGap = 0 }: DocumentPageGuidesProps) {
    const nextPages = pages.slice(1);
    if (nextPages.length === 0) return null;

    return (
        <div className="document-page-guides" aria-hidden="true">
            {nextPages.map((page) => (
                <div
                    key={page.pageNumber}
                    className="document-page-guide"
                    style={{
                        top: page.top + ((page.pageNumber - 1) * pageGap) - (pageGap / 2),
                    }}
                >
                    <span className="document-page-guide__notch document-page-guide__notch--left" />
                    <span className="document-page-guide__notch document-page-guide__notch--right" />
                    <span className="document-page-guide__label">Page {page.pageNumber}</span>
                </div>
            ))}
        </div>
    );
}
