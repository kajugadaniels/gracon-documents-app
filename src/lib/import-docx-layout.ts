/**
 * DOCX import layout helpers.
 *
 * Mammoth exposes paragraph indentation in twips and inline tab characters.
 * These helpers convert the available Word layout data into the same HTML
 * attributes parsed by ParagraphLayoutExtension, so imported documents keep
 * ruler-aware paragraph layout instead of flattening everything to plain text.
 */
export const DOCX_TWIP_TO_CSS_PX = 1 / 15;
export const IMPORT_A4_PAPER_WIDTH_PX = 794;
export const IMPORT_A4_PAPER_MARGIN_PX = 96;
export const IMPORT_MAX_PARAGRAPH_WIDTH_PX = IMPORT_A4_PAPER_WIDTH_PX - (IMPORT_A4_PAPER_MARGIN_PX * 2);
export const IMPORT_MAX_PARAGRAPH_TAB_STOPS = 12;
export const IMPORT_TAB_STOP_SNAP_PX = 24;
export const IMPORT_PARAGRAPH_TAB_STOP_ALIGNS = ['left', 'center', 'right', 'decimal'] as const;

export type ImportedParagraphTabStopAlign = typeof IMPORT_PARAGRAPH_TAB_STOP_ALIGNS[number];

export interface ImportedParagraphTabStop {
    position: number;
    align: ImportedParagraphTabStopAlign;
}

export interface ImportedParagraphLayout {
    leftIndent: number;
    firstLineIndent: number;
    tabStops: ImportedParagraphTabStop[];
}

const EMPTY_LAYOUT: ImportedParagraphLayout = {
    leftIndent: 0,
    firstLineIndent: 0,
    tabStops: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export function twipToPx(value: unknown) {
    const numericValue = toNumber(value);

    if (numericValue === null) {
        return 0;
    }

    return Math.round(numericValue * DOCX_TWIP_TO_CSS_PX);
}

function normalizeImportedTabStops(value: unknown): ImportedParagraphTabStop[] {
    const source = Array.isArray(value) ? value : [];
    const seen = new Set<string>();

    return source
        .map((entry): ImportedParagraphTabStop | null => {
            if (isRecord(entry)) {
                const position = toNumber(entry.position ?? entry.pos ?? entry.value);
                const align = typeof entry.align === 'string' && IMPORT_PARAGRAPH_TAB_STOP_ALIGNS.includes(entry.align as ImportedParagraphTabStopAlign)
                    ? entry.align as ImportedParagraphTabStopAlign
                    : 'left';

                return position === null ? null : { position, align };
            }

            const position = toNumber(entry);
            return position === null ? null : { position, align: 'left' };
        })
        .filter((entry): entry is ImportedParagraphTabStop => entry !== null)
        .map((entry) => ({
            ...entry,
            position: twipToPx(entry.position),
        }))
        .map((entry) => ({
            ...entry,
            position: Math.round(entry.position / IMPORT_TAB_STOP_SNAP_PX) * IMPORT_TAB_STOP_SNAP_PX,
        }))
        .map((entry) => ({
            ...entry,
            position: clamp(entry.position, IMPORT_TAB_STOP_SNAP_PX, IMPORT_MAX_PARAGRAPH_WIDTH_PX),
        }))
        .filter((entry) => {
            const key = String(entry.position);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => a.position - b.position || a.align.localeCompare(b.align))
        .slice(0, IMPORT_MAX_PARAGRAPH_TAB_STOPS);
}

function mapDocxTabStopAlign(value: string | null): ImportedParagraphTabStopAlign | null {
    if (value === null || value === 'left' || value === 'start') return 'left';
    if (value === 'center') return 'center';
    if (value === 'right' || value === 'end') return 'right';
    if (value === 'decimal') return 'decimal';
    return null;
}

export function createImportedParagraphLayout(element: unknown): ImportedParagraphLayout {
    if (!isRecord(element)) {
        return EMPTY_LAYOUT;
    }

    const indent = isRecord(element.indent) ? element.indent : {};
    const leftIndent = clamp(twipToPx(indent.start ?? indent.left), 0, IMPORT_MAX_PARAGRAPH_WIDTH_PX);
    const firstLineIndent = clamp(
        twipToPx(indent.firstLine) - twipToPx(indent.hanging),
        -IMPORT_MAX_PARAGRAPH_WIDTH_PX,
        IMPORT_MAX_PARAGRAPH_WIDTH_PX,
    );
    const tabStops = normalizeImportedTabStops(
        element.tabStops ?? element.tabs ?? (isRecord(indent) ? indent.tabStops : undefined),
    );

    return {
        leftIndent,
        firstLineIndent,
        tabStops,
    };
}

export function collectImportedParagraphLayouts(document: unknown) {
    const layouts: ImportedParagraphLayout[] = [];

    function visit(node: unknown) {
        if (!isRecord(node)) {
            return;
        }

        if (node.type === 'paragraph') {
            layouts.push(createImportedParagraphLayout(node));
        }

        if (Array.isArray(node.children)) {
            node.children.forEach(visit);
        }
    }

    visit(document);

    return layouts;
}

function getAttributeValue(xml: string, localName: string) {
    const pattern = new RegExp(`(?:[\\w.-]+:)?${localName}="([^"]+)"`);
    return xml.match(pattern)?.[1] ?? null;
}

/**
 * Extracts paragraph-level tab stops from `word/document.xml`.
 *
 * Mammoth currently keeps inline `w:tab` characters but does not expose
 * paragraph `w:tabs` metadata. This lightweight parser only reads the
 * paragraph properties we need and keeps document order aligned with Mammoth's
 * paragraph traversal.
 */
export function extractParagraphTabStopsFromDocumentXml(documentXml: string) {
    if (!documentXml.trim()) {
        return [];
    }

    const paragraphMatches = documentXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];

    return paragraphMatches.map((paragraphXml) => {
        const paragraphProperties = paragraphXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/)?.[0] ?? '';
        const tabsXml = paragraphProperties.match(/<w:tabs\b[\s\S]*?<\/w:tabs>/)?.[0] ?? '';

        if (!tabsXml) {
            return [];
        }

        const tabMatches = tabsXml.match(/<w:tab\b[^>]*\/?>/g) ?? [];
        const positions = tabMatches
            .map((tabXml) => ({
                position: getAttributeValue(tabXml, 'pos'),
                align: mapDocxTabStopAlign(getAttributeValue(tabXml, 'val')),
            }))
            .filter((tabStop): tabStop is { position: string; align: ImportedParagraphTabStopAlign } => (
                tabStop.position !== null && tabStop.align !== null
            ));

        return normalizeImportedTabStops(positions);
    });
}

export function mergeParagraphTabStopsIntoLayouts(
    paragraphLayouts: ImportedParagraphLayout[],
    paragraphTabStops: ImportedParagraphTabStop[][],
) {
    return paragraphLayouts.map((layout, index) => {
        const tabStops = paragraphTabStops[index] ?? [];

        if (tabStops.length === 0) {
            return layout;
        }

        return {
            ...layout,
            tabStops,
        };
    });
}

function hasLayout(layout: ImportedParagraphLayout) {
    return layout.leftIndent !== 0 || layout.firstLineIndent !== 0 || layout.tabStops.length > 0;
}

function mergeStyle(existingStyle: string | null, nextStyle: string) {
    const trimmedExisting = existingStyle?.trim().replace(/;$/, '');
    const trimmedNext = nextStyle.trim().replace(/;$/, '');

    return [trimmedExisting, trimmedNext].filter(Boolean).join('; ');
}

export function annotateImportedDocxHtml(html: string, paragraphLayouts: ImportedParagraphLayout[]) {
    if (!html.trim() || paragraphLayouts.length === 0 || typeof DOMParser === 'undefined') {
        return html;
    }

    const parser = new DOMParser();
    const document = parser.parseFromString(html, 'text/html');
    const paragraphNodes = Array.from(document.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6'));

    paragraphNodes.forEach((node, index) => {
        const layout = paragraphLayouts[index];

        if (!layout || !hasLayout(layout)) {
            return;
        }

        const styleParts: string[] = [];

        if (layout.leftIndent) {
            node.setAttribute('data-left-indent', String(layout.leftIndent));
            styleParts.push(`margin-left: ${layout.leftIndent}px`);
        }

        if (layout.firstLineIndent) {
            node.setAttribute('data-first-line-indent', String(layout.firstLineIndent));
            styleParts.push(`text-indent: ${layout.firstLineIndent}px`);
        }

        if (layout.tabStops.length > 0) {
            node.setAttribute('data-tab-stops', JSON.stringify(layout.tabStops));
        }

        if (styleParts.length > 0) {
            node.setAttribute('style', mergeStyle(node.getAttribute('style'), styleParts.join('; ')));
        }
    });

    return document.body.innerHTML;
}
