/**
 * Shared document layout utilities for the editor and export layers.
 *
 * Layout must stay normalized across API payloads, live paper rendering,
 * rulers, and export pipelines so margins do not drift between surfaces.
 */
import type { CSSProperties } from 'react';
import { A4_PAPER_MARGIN_PX, A4_PAPER_WIDTH_PX } from '@/constants/document-paper';

export const MIN_DOCUMENT_MARGIN_PX = 48;
export const MAX_DOCUMENT_MARGIN_PX = 192;
export const MIN_DOCUMENT_PRINTABLE_WIDTH_PX = 320;
export const MIN_PARAGRAPH_CONTENT_WIDTH_PX = 72;
export const MAX_PARAGRAPH_TAB_STOPS = 12;
export const TAB_STOP_SNAP_PX = 24;
export const PARAGRAPH_TAB_STOP_ALIGNS = ['left', 'center', 'right', 'decimal'] as const;

export type ParagraphTabStopAlign = typeof PARAGRAPH_TAB_STOP_ALIGNS[number];

export interface ParagraphTabStop {
    position: number;
    align: ParagraphTabStopAlign;
}

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

export interface ParagraphIndentation {
    leftIndent: number;
    firstLineIndent: number;
}

export interface ParagraphLayoutState extends ParagraphIndentation {
    tabStops: ParagraphTabStop[];
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

    return Math.min(MAX_DOCUMENT_MARGIN_PX, Math.max(MIN_DOCUMENT_MARGIN_PX, Math.round(value)));
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

/**
 * Clamps horizontal margins so the writable area always remains valid.
 *
 * This is shared by page setup controls and ruler dragging so all layout
 * editing paths preserve the same printable-width guardrails.
 */
export function clampHorizontalDocumentMargins(
    width: number,
    margins: Pick<DocumentLayoutMargins, 'left' | 'right'>,
): Pick<DocumentLayoutMargins, 'left' | 'right'> {
    const widthSafe = Math.max(width, MIN_DOCUMENT_PRINTABLE_WIDTH_PX + (MIN_DOCUMENT_MARGIN_PX * 2));
    const left = clampMargin(margins.left, DEFAULT_DOCUMENT_LAYOUT.margins.left);
    const right = clampMargin(margins.right, DEFAULT_DOCUMENT_LAYOUT.margins.right);
    const maxLeft = Math.max(
        MIN_DOCUMENT_MARGIN_PX,
        widthSafe - right - MIN_DOCUMENT_PRINTABLE_WIDTH_PX,
    );
    const nextLeft = Math.min(left, maxLeft);
    const maxRight = Math.max(
        MIN_DOCUMENT_MARGIN_PX,
        widthSafe - nextLeft - MIN_DOCUMENT_PRINTABLE_WIDTH_PX,
    );
    const nextRight = Math.min(right, maxRight);

    return {
        left: nextLeft,
        right: nextRight,
    };
}

/**
 * Clamps paragraph indentation against the current printable area.
 *
 * Left indent is measured from the page's writable left edge.
 * First-line indent is measured relative to the paragraph's left indent and
 * may be negative to support hanging indents.
 */
export function clampParagraphIndentation(
    pageWidth: number,
    margins: Pick<DocumentLayoutMargins, 'left' | 'right'>,
    indentation: ParagraphIndentation,
): ParagraphIndentation {
    const printableWidth = Math.max(
        MIN_PARAGRAPH_CONTENT_WIDTH_PX,
        pageWidth - margins.left - margins.right,
    );
    const maxLeftIndent = Math.max(0, printableWidth - MIN_PARAGRAPH_CONTENT_WIDTH_PX);
    const leftIndent = Math.min(
        maxLeftIndent,
        Math.max(0, Math.round(indentation.leftIndent)),
    );
    const minFirstLineIndent = -leftIndent;
    const maxFirstLineIndent = Math.max(
        0,
        printableWidth - leftIndent - MIN_PARAGRAPH_CONTENT_WIDTH_PX,
    );
    const firstLineIndent = Math.min(
        maxFirstLineIndent,
        Math.max(minFirstLineIndent, Math.round(indentation.firstLineIndent)),
    );

    return {
        leftIndent,
        firstLineIndent,
    };
}

/**
 * Normalizes paragraph tab-stop positions against the writable content width.
 */
export function normalizeParagraphTabStops(
    pageWidth: number,
    margins: Pick<DocumentLayoutMargins, 'left' | 'right'>,
    tabStops: unknown,
): ParagraphTabStop[] {
    const printableWidth = Math.max(
        MIN_PARAGRAPH_CONTENT_WIDTH_PX,
        pageWidth - margins.left - margins.right,
    );
    const source = Array.isArray(tabStops) ? tabStops : [];
    const seen = new Set<string>();

    return source
        .map((value): ParagraphTabStop | null => {
            if (typeof value === 'number' && Number.isFinite(value)) {
                return { position: value, align: 'left' };
            }

            if (!value || typeof value !== 'object' || Array.isArray(value)) {
                return null;
            }

            const sourceValue = value as Record<string, unknown>;
            const rawPosition = sourceValue.position;
            const rawAlign = sourceValue.align;
            const position = typeof rawPosition === 'number' && Number.isFinite(rawPosition)
                ? rawPosition
                : null;
            const align = typeof rawAlign === 'string' && PARAGRAPH_TAB_STOP_ALIGNS.includes(rawAlign as ParagraphTabStopAlign)
                ? rawAlign as ParagraphTabStopAlign
                : 'left';

            return position === null ? null : { position, align };
        })
        .filter((value): value is ParagraphTabStop => value !== null)
        .map((value) => ({
            ...value,
            position: Math.round(value.position / TAB_STOP_SNAP_PX) * TAB_STOP_SNAP_PX,
        }))
        .map((value) => ({
            ...value,
            position: Math.min(printableWidth, Math.max(TAB_STOP_SNAP_PX, value.position)),
        }))
        .filter((value) => {
            const key = String(value.position);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => a.position - b.position || a.align.localeCompare(b.align))
        .slice(0, MAX_PARAGRAPH_TAB_STOPS);
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
