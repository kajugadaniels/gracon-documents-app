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
    tabStops: number[];
    cssStyle: string;
    dataAttributes: {
        leftIndent?: string;
        firstLineIndent?: string;
        tabStops?: string;
    };
    docxIndentTwips: {
        left?: number;
        firstLine?: number;
        hanging?: number;
    };
    docxTabStopTwips: number[];
}

function normalizeNumber(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
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
    const seen = new Set<number>();

    return source
        .map((value) => (typeof value === 'number' && Number.isFinite(value) ? value : null))
        .filter((value): value is number => value !== null)
        .map((value) => Math.round(value / EXPORT_TAB_STOP_SNAP_PX) * EXPORT_TAB_STOP_SNAP_PX)
        .map((value) => Math.min(printableWidth, Math.max(EXPORT_TAB_STOP_SNAP_PX, value)))
        .filter((value) => {
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
        })
        .sort((a, b) => a - b)
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
        tabStops?: unknown;
    },
    layoutInput?: Partial<DocumentLayout> | null,
): ParagraphExportGeometry {
    const layout = normalizeExportLayout(layoutInput);
    const leftIndent = normalizeNumber(input.leftIndent);
    const firstLineIndent = normalizeNumber(input.firstLineIndent);
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

    return {
        leftIndent,
        firstLineIndent,
        tabStops,
        cssStyle: styleParts.join('; '),
        dataAttributes: {
            ...(leftIndent || firstLineIndent ? { leftIndent: String(leftIndent) } : {}),
            ...(firstLineIndent ? { firstLineIndent: String(firstLineIndent) } : {}),
            ...(tabStops.length > 0 ? { tabStops: JSON.stringify(tabStops) } : {}),
        },
        docxIndentTwips: {
            ...(leftIndent > 0 ? { left: pxToTwip(leftIndent) } : {}),
            ...(firstLineIndent > 0 ? { firstLine: pxToTwip(firstLineIndent) } : {}),
            ...(firstLineIndent < 0 ? { hanging: pxToTwip(Math.abs(firstLineIndent)) } : {}),
        },
        docxTabStopTwips: tabStops.map(pxToTwip),
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
