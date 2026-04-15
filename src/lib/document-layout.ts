/**
 * Shared document layout utilities for the editor and export layers.
 *
 * Layout must stay normalized across API payloads, live paper rendering,
 * rulers, and export pipelines so margins do not drift between surfaces.
 */
import type { CSSProperties } from 'react';
import { A4_PAPER_MARGIN_PX, A4_PAPER_WIDTH_PX } from '@/constants/document-paper';

export interface DocumentLayoutMargins {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface DocumentLayout {
    paperSize: 'A4';
    margins: DocumentLayoutMargins;
}

export const DEFAULT_DOCUMENT_LAYOUT: DocumentLayout = {
    paperSize: 'A4',
    margins: {
        top: A4_PAPER_MARGIN_PX,
        right: A4_PAPER_MARGIN_PX,
        bottom: A4_PAPER_MARGIN_PX,
        left: A4_PAPER_MARGIN_PX,
    },
};

function clampMargin(value: unknown, fallback: number) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }

    return Math.min(192, Math.max(48, Math.round(value)));
}

export function normalizeDocumentLayout(raw: unknown): DocumentLayout {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return {
            paperSize: DEFAULT_DOCUMENT_LAYOUT.paperSize,
            margins: { ...DEFAULT_DOCUMENT_LAYOUT.margins },
        };
    }

    const source = raw as Record<string, unknown>;
    const rawMargins = (
        source.margins &&
        typeof source.margins === 'object' &&
        !Array.isArray(source.margins)
    )
        ? source.margins as Record<string, unknown>
        : {};

    return {
        paperSize: 'A4',
        margins: {
            top: clampMargin(rawMargins.top, DEFAULT_DOCUMENT_LAYOUT.margins.top),
            right: clampMargin(rawMargins.right, DEFAULT_DOCUMENT_LAYOUT.margins.right),
            bottom: clampMargin(rawMargins.bottom, DEFAULT_DOCUMENT_LAYOUT.margins.bottom),
            left: clampMargin(rawMargins.left, DEFAULT_DOCUMENT_LAYOUT.margins.left),
        },
    };
}

export function buildDocumentLayoutStyle(layout: DocumentLayout): CSSProperties {
    const printableWidth = Math.max(
        0,
        A4_PAPER_WIDTH_PX - layout.margins.left - layout.margins.right,
    );

    const style: Record<string, string> = {
        '--paper-margin-left': `${layout.margins.left}px`,
        '--paper-margin-right': `${layout.margins.right}px`,
        '--paper-margin-top': `${layout.margins.top}px`,
        '--paper-margin-bottom': `${layout.margins.bottom}px`,
        '--editor-page-padding-left': `${layout.margins.left}px`,
        '--editor-page-padding-right': `${layout.margins.right}px`,
        '--editor-page-padding-top': `${layout.margins.top}px`,
        '--editor-page-padding-bottom': `${layout.margins.bottom}px`,
        '--paper-printable-width': `${printableWidth}px`,
    };

    return style as CSSProperties;
}

function parsePx(value: string, fallback: number) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function readDocumentLayoutFromElement(sourceEl: HTMLElement): DocumentLayout {
    const style = window.getComputedStyle(sourceEl);

    return normalizeDocumentLayout({
        paperSize: 'A4',
        margins: {
            top: parsePx(
                style.getPropertyValue('--editor-page-padding-top'),
                DEFAULT_DOCUMENT_LAYOUT.margins.top,
            ),
            right: parsePx(
                style.getPropertyValue('--editor-page-padding-right'),
                DEFAULT_DOCUMENT_LAYOUT.margins.right,
            ),
            bottom: parsePx(
                style.getPropertyValue('--editor-page-padding-bottom'),
                DEFAULT_DOCUMENT_LAYOUT.margins.bottom,
            ),
            left: parsePx(
                style.getPropertyValue('--editor-page-padding-left'),
                DEFAULT_DOCUMENT_LAYOUT.margins.left,
            ),
        },
    });
}
