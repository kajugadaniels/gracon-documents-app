/**
 * Pure layout conversion helpers shared by editor export surfaces.
 *
 * These helpers keep PDF geometry, DOCX page settings, paragraph indents,
 * and tab-stop conversion aligned without depending on browser DOM APIs.
 */
export const CSS_PX_TO_TWIP = 15;
export const EXPORT_A4_PAPER_WIDTH_PX = 794;
export const EXPORT_A4_PAPER_MARGIN_PX = 96;
export const EXPORT_A4_PAPER_WIDTH_TWIP = 11906;
export const EXPORT_A4_PAPER_HEIGHT_TWIP = 16838;
export const EXPORT_MIN_DOCUMENT_MARGIN_PX = 48;
export const EXPORT_MAX_DOCUMENT_MARGIN_PX = 192;
export const EXPORT_MIN_PARAGRAPH_CONTENT_WIDTH_PX = 72;
export const EXPORT_MAX_PARAGRAPH_TAB_STOPS = 12;
export const EXPORT_TAB_STOP_SNAP_PX = 24;
export const EXPORT_PARAGRAPH_TAB_STOP_ALIGNS = ['left', 'center', 'right', 'decimal'] as const;
export const EXPORT_MIN_PARAGRAPH_LINE_HEIGHT = 0.75;
export const EXPORT_MAX_PARAGRAPH_LINE_HEIGHT = 3;
export const EXPORT_DOCX_SINGLE_LINE_HEIGHT = 240;

export type ExportParagraphTabStopAlign = typeof EXPORT_PARAGRAPH_TAB_STOP_ALIGNS[number];

export interface ExportParagraphTabStop {
    position: number;
    align: ExportParagraphTabStopAlign;
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

const DEFAULT_EXPORT_LAYOUT: DocumentLayout = {
    paperSize: 'A4',
    margins: {
        top: EXPORT_A4_PAPER_MARGIN_PX,
        right: EXPORT_A4_PAPER_MARGIN_PX,
        bottom: EXPORT_A4_PAPER_MARGIN_PX,
        left: EXPORT_A4_PAPER_MARGIN_PX,
    },
};

export interface PaperExportGeometry {
    margins: DocumentLayoutMargins;
    printableWidth: number;
    cssVars: Record<string, string>;
    docxTwipMargins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}

export interface ParagraphExportGeometry {
    leftIndent: number;
    firstLineIndent: number;
    lineHeight: number | null;
    tabStops: ExportParagraphTabStop[];
    cssStyle: string;
    dataAttributes: {
        leftIndent?: string;
        firstLineIndent?: string;
        lineHeight?: string;
        tabStops?: string;
    };
    docxIndentTwips: {
        left?: number;
        firstLine?: number;
        hanging?: number;
    };
    docxTabStops: {
        position: number;
        align: ExportParagraphTabStopAlign;
    }[];
    docxLineSpacing?: number;
}

function normalizeNumber(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
}

export function normalizeParagraphLineHeight(value: unknown) {
    const parsed = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? Number.parseFloat(value)
            : Number.NaN;

    if (!Number.isFinite(parsed)) {
        return null;
    }

    return Math.min(
        EXPORT_MAX_PARAGRAPH_LINE_HEIGHT,
        Math.max(EXPORT_MIN_PARAGRAPH_LINE_HEIGHT, Number(parsed.toFixed(2))),
    );
}

function clampMargin(value: unknown, fallback: number) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }

    return Math.min(EXPORT_MAX_DOCUMENT_MARGIN_PX, Math.max(EXPORT_MIN_DOCUMENT_MARGIN_PX, Math.round(value)));
}

function normalizeExportLayout(raw: Partial<DocumentLayout> | null | undefined): DocumentLayout {
    const rawMargins: Partial<DocumentLayoutMargins> = raw?.margins ?? {};

    return {
        paperSize: 'A4',
        margins: {
            top: clampMargin(rawMargins.top, DEFAULT_EXPORT_LAYOUT.margins.top),
            right: clampMargin(rawMargins.right, DEFAULT_EXPORT_LAYOUT.margins.right),
            bottom: clampMargin(rawMargins.bottom, DEFAULT_EXPORT_LAYOUT.margins.bottom),
            left: clampMargin(rawMargins.left, DEFAULT_EXPORT_LAYOUT.margins.left),
        },
    };
}

function normalizeExportTabStops(
    pageWidth: number,
    margins: Pick<DocumentLayoutMargins, 'left' | 'right'>,
    tabStops: unknown,
) {
    const printableWidth = Math.max(
        EXPORT_MIN_PARAGRAPH_CONTENT_WIDTH_PX,
        pageWidth - margins.left - margins.right,
    );
    const source = Array.isArray(tabStops) ? tabStops : [];
    const seen = new Set<string>();

    return source
        .map((value): ExportParagraphTabStop | null => {
            if (typeof value === 'number' && Number.isFinite(value)) {
                return { position: value, align: 'left' };
            }

            if (!value || typeof value !== 'object' || Array.isArray(value)) {
                return null;
            }

            const rawValue = value as Record<string, unknown>;
            const position = typeof rawValue.position === 'number' && Number.isFinite(rawValue.position)
                ? rawValue.position
                : null;
            const align = typeof rawValue.align === 'string' && EXPORT_PARAGRAPH_TAB_STOP_ALIGNS.includes(rawValue.align as ExportParagraphTabStopAlign)
                ? rawValue.align as ExportParagraphTabStopAlign
                : 'left';

            return position === null ? null : { position, align };
        })
        .filter((value): value is ExportParagraphTabStop => value !== null)
        .map((value) => ({
            ...value,
            position: Math.round(value.position / EXPORT_TAB_STOP_SNAP_PX) * EXPORT_TAB_STOP_SNAP_PX,
        }))
        .map((value) => ({
            ...value,
            position: Math.min(printableWidth, Math.max(EXPORT_TAB_STOP_SNAP_PX, value.position)),
        }))
        .filter((value) => {
            const key = String(value.position);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => a.position - b.position || a.align.localeCompare(b.align))
        .slice(0, EXPORT_MAX_PARAGRAPH_TAB_STOPS);
}

export function pxToTwip(px: number) {
    return Math.max(Math.round(px * CSS_PX_TO_TWIP), 0);
}

/**
 * Creates the shared paper geometry used by PDF capture and DOCX export.
 */
export function createPaperExportGeometry(layoutInput?: Partial<DocumentLayout> | null): PaperExportGeometry {
    const layout = normalizeExportLayout(layoutInput);
    const printableWidth = EXPORT_A4_PAPER_WIDTH_PX - layout.margins.left - layout.margins.right;

    return {
        margins: layout.margins,
        printableWidth,
        cssVars: {
            '--paper-margin-left': `${layout.margins.left}px`,
            '--paper-margin-right': `${layout.margins.right}px`,
            '--paper-margin-top': `${layout.margins.top}px`,
            '--paper-margin-bottom': `${layout.margins.bottom}px`,
            '--paper-margin': `${layout.margins.left}px`,
            '--editor-page-padding-left': `${layout.margins.left}px`,
            '--editor-page-padding-right': `${layout.margins.right}px`,
            '--editor-page-padding-top': `${layout.margins.top}px`,
            '--editor-page-padding-bottom': `${layout.margins.bottom}px`,
            '--paper-printable-width': `${printableWidth}px`,
        },
        docxTwipMargins: {
            top: pxToTwip(layout.margins.top),
            right: pxToTwip(layout.margins.right),
            bottom: pxToTwip(layout.margins.bottom),
            left: pxToTwip(layout.margins.left),
        },
    };
}

/**
 * Creates the shared paragraph layout geometry used by editor HTML and DOCX.
 */
export function createParagraphExportGeometry(
    input: {
        leftIndent?: unknown;
        firstLineIndent?: unknown;
        lineHeight?: unknown;
        tabStops?: unknown;
    },
    layoutInput?: Partial<DocumentLayout> | null,
): ParagraphExportGeometry {
    const layout = normalizeExportLayout(layoutInput);
    const leftIndent = normalizeNumber(input.leftIndent);
    const firstLineIndent = normalizeNumber(input.firstLineIndent);
    const lineHeight = normalizeParagraphLineHeight(input.lineHeight);
    const tabStops = normalizeExportTabStops(
        EXPORT_A4_PAPER_WIDTH_PX,
        layout.margins,
        input.tabStops,
    );
    const styleParts: string[] = [];

    if (leftIndent) {
        styleParts.push(`margin-left: ${leftIndent}px`);
    }

    if (firstLineIndent) {
        styleParts.push(`text-indent: ${firstLineIndent}px`);
    }

    if (lineHeight !== null) {
        styleParts.push(`line-height: ${lineHeight}`);
    }

    return {
        leftIndent,
        firstLineIndent,
        lineHeight,
        tabStops,
        cssStyle: styleParts.join('; '),
        dataAttributes: {
            ...(leftIndent || firstLineIndent ? { leftIndent: String(leftIndent) } : {}),
            ...(firstLineIndent ? { firstLineIndent: String(firstLineIndent) } : {}),
            ...(lineHeight !== null ? { lineHeight: String(lineHeight) } : {}),
            ...(tabStops.length > 0 ? { tabStops: JSON.stringify(tabStops) } : {}),
        },
        docxIndentTwips: {
            ...(leftIndent > 0 ? { left: pxToTwip(leftIndent) } : {}),
            ...(firstLineIndent > 0 ? { firstLine: pxToTwip(firstLineIndent) } : {}),
            ...(firstLineIndent < 0 ? { hanging: pxToTwip(Math.abs(firstLineIndent)) } : {}),
        },
        docxTabStops: tabStops.map((tabStop) => ({
            position: pxToTwip(tabStop.position),
            align: tabStop.align,
        })),
        docxLineSpacing: lineHeight !== null
            ? Math.round(lineHeight * EXPORT_DOCX_SINGLE_LINE_HEIGHT)
            : undefined,
    };
}

export function createDocxPageProperties(layoutInput?: Partial<DocumentLayout> | null) {
    const geometry = createPaperExportGeometry(layoutInput);

    return {
        page: {
            size: {
                width: EXPORT_A4_PAPER_WIDTH_TWIP,
                height: EXPORT_A4_PAPER_HEIGHT_TWIP,
            },
            margin: {
                ...geometry.docxTwipMargins,
                header: 0,
                footer: 0,
                gutter: 0,
            },
        },
    };
}
