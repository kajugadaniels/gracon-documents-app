'use client';

import { useEffect } from 'react';

const APP_TITLE_SUFFIX = 'Gracon 360';

function normalizePageTitle(title: string) {
    const trimmed = title.trim();
    return trimmed ? trimmed : 'Documents';
}

export function buildDocumentTitle(title: string) {
    return `${normalizePageTitle(title)} | ${APP_TITLE_SUFFIX}`;
}

/**
 * Sets the browser tab title from client-owned pages.
 *
 * Most protected document routes are client components because their data is
 * loaded through session-aware browser state, so route metadata cannot own
 * dynamic titles there.
 */
export function useDocumentTitle(title: string) {
    useEffect(() => {
        document.title = buildDocumentTitle(title);
    }, [title]);
}
