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
export const IMPORT_BULLET_LIST_STYLES = ['disc', 'circle', 'square'] as const;
export const IMPORT_ORDERED_LIST_STYLES = ['decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'] as const;

export type ImportedParagraphTabStopAlign = typeof IMPORT_PARAGRAPH_TAB_STOP_ALIGNS[number];
export type ImportedBulletListStyle = typeof IMPORT_BULLET_LIST_STYLES[number];
export type ImportedOrderedListStyle = typeof IMPORT_ORDERED_LIST_STYLES[number];

export type ImportedParagraphListStyle =
    | { kind: 'bulletList'; style: ImportedBulletListStyle }
    | { kind: 'orderedList'; style: ImportedOrderedListStyle };

export interface ImportedParagraphTabStop {
    position: number;
    align: ImportedParagraphTabStopAlign;
}

export interface ImportedParagraphLayout {
    leftIndent: number;
    firstLineIndent: number;
    tabStops: ImportedParagraphTabStop[];
}

export interface ImportedDocxStyle {
    style: string;
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

function mapDocxNumberFormat(value: string | null, levelText: string | null): ImportedParagraphListStyle | null {
    if (!value) {
        return null;
    }

    if (value === 'bullet') {
        if (levelText === '▪' || levelText === '■' || levelText === '□') {
            return { kind: 'bulletList', style: 'square' };
        }

        if (levelText === '◦' || levelText === 'o' || levelText === '○') {
            return { kind: 'bulletList', style: 'circle' };
        }

        return { kind: 'bulletList', style: 'disc' };
    }

    if (value === 'lowerLetter') return { kind: 'orderedList', style: 'lower-alpha' };
    if (value === 'upperLetter') return { kind: 'orderedList', style: 'upper-alpha' };
    if (value === 'lowerRoman') return { kind: 'orderedList', style: 'lower-roman' };
    if (value === 'upperRoman') return { kind: 'orderedList', style: 'upper-roman' };

    return { kind: 'orderedList', style: 'decimal' };
}

function parseDocxNumberingStyles(numberingXml: string) {
    const abstractStyles = new Map<string, Map<string, ImportedParagraphListStyle>>();
    const numberingStyles = new Map<string, Map<string, ImportedParagraphListStyle>>();
    const abstractMatches = numberingXml.match(/<w:abstractNum\b[\s\S]*?<\/w:abstractNum>/g) ?? [];

    abstractMatches.forEach((abstractXml) => {
        const abstractNumId = getAttributeValue(abstractXml.match(/<w:abstractNum\b[^>]*>/)?.[0] ?? '', 'abstractNumId');
        if (!abstractNumId) return;

        const levelStyles = new Map<string, ImportedParagraphListStyle>();
        const levelMatches = abstractXml.match(/<w:lvl\b[\s\S]*?<\/w:lvl>/g) ?? [];

        levelMatches.forEach((levelXml) => {
            const level = getAttributeValue(levelXml.match(/<w:lvl\b[^>]*>/)?.[0] ?? '', 'ilvl') ?? '0';
            const numberFormat = getAttributeValue(levelXml.match(/<w:numFmt\b[^>]*\/?>/)?.[0] ?? '', 'val');
            const levelText = getAttributeValue(levelXml.match(/<w:lvlText\b[^>]*\/?>/)?.[0] ?? '', 'val');
            const style = mapDocxNumberFormat(numberFormat, levelText);

            if (style) {
                levelStyles.set(level, style);
            }
        });

        abstractStyles.set(abstractNumId, levelStyles);
    });

    const numberingMatches = numberingXml.match(/<w:num\b[\s\S]*?<\/w:num>/g) ?? [];

    numberingMatches.forEach((numberingXmlBlock) => {
        const numId = getAttributeValue(numberingXmlBlock.match(/<w:num\b[^>]*>/)?.[0] ?? '', 'numId');
        const abstractNumId = getAttributeValue(numberingXmlBlock.match(/<w:abstractNumId\b[^>]*\/?>/)?.[0] ?? '', 'val');

        if (numId && abstractNumId) {
            numberingStyles.set(numId, abstractStyles.get(abstractNumId) ?? new Map());
        }
    });

    return numberingStyles;
}

/**
 * Extracts paragraph list styles from DOCX numbering metadata in document order.
 *
 * Mammoth emits semantic `<ul>`/`<ol>` elements, but it does not expose all Word
 * numbering formats in HTML. This parser recovers the list marker style for
 * each numbered paragraph so imported HTML can be annotated before TipTap parses
 * it into schema-backed list attributes.
 */
export function extractParagraphListStylesFromDocxXml(documentXml: string, numberingXml: string | null) {
    if (!documentXml.trim() || !numberingXml?.trim()) {
        return [];
    }

    const numberingStyles = parseDocxNumberingStyles(numberingXml);
    const paragraphMatches = documentXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];

    return paragraphMatches.map((paragraphXml): ImportedParagraphListStyle | null => {
        const paragraphProperties = paragraphXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/)?.[0] ?? '';
        const numberingProperties = paragraphProperties.match(/<w:numPr\b[\s\S]*?<\/w:numPr>/)?.[0] ?? '';

        if (!numberingProperties) {
            return null;
        }

        const level = getAttributeValue(numberingProperties.match(/<w:ilvl\b[^>]*\/?>/)?.[0] ?? '', 'val') ?? '0';
        const numId = getAttributeValue(numberingProperties.match(/<w:numId\b[^>]*\/?>/)?.[0] ?? '', 'val');

        return numId ? numberingStyles.get(numId)?.get(level) ?? null : null;
    });
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

function getXmlBlocks(xml: string, tagName: string) {
    const escapedTagName = tagName.replace(':', '\\:');
    return xml.match(new RegExp(`<${escapedTagName}\\b[\\s\\S]*?<\\/${escapedTagName}>`, 'g')) ?? [];
}

function getXmlStartTag(xml: string, tagName: string) {
    const escapedTagName = tagName.replace(':', '\\:');
    return xml.match(new RegExp(`<${escapedTagName}\\b[^>]*\\/?>`))?.[0] ?? '';
}

function getXmlChildBlock(xml: string, tagName: string) {
    const escapedTagName = tagName.replace(':', '\\:');
    return xml.match(new RegExp(`<${escapedTagName}\\b[\\s\\S]*?<\\/${escapedTagName}>`))?.[0] ?? '';
}

function getXmlChildTag(xml: string, tagName: string) {
    const escapedTagName = tagName.replace(':', '\\:');
    return xml.match(new RegExp(`<${escapedTagName}\\b[^>]*\\/?>`))?.[0] ?? '';
}

function docxColorToCss(value: string | null) {
    if (!value || value === 'auto') return 'rgba(22, 16, 58, 0.38)';
    return /^([0-9a-f]{6})$/i.test(value) ? `#${value}` : 'rgba(22, 16, 58, 0.38)';
}

function docxBorderToCss(borderXml: string) {
    const value = getAttributeValue(borderXml, 'val');
    if (!value || value === 'nil' || value === 'none') return null;

    const size = Math.max(1, Math.round((toNumber(getAttributeValue(borderXml, 'sz')) ?? 6) / 8));
    const color = docxColorToCss(getAttributeValue(borderXml, 'color'));
    const style = value.includes('dash') ? 'dashed' : value.includes('dot') ? 'dotted' : 'solid';

    return `${size}px ${style} ${color}`;
}

function collectParagraphStyleFromProperties(paragraphProperties: string): string[] {
    const styleParts: string[] = [];
    const spacingTag = getXmlChildTag(paragraphProperties, 'w:spacing');
    const alignmentTag = getXmlChildTag(paragraphProperties, 'w:jc');
    const paragraphBorders = getXmlChildBlock(paragraphProperties, 'w:pBdr');

    if (spacingTag) {
        const before = twipToPx(getAttributeValue(spacingTag, 'before'));
        const after = twipToPx(getAttributeValue(spacingTag, 'after'));
        const line = toNumber(getAttributeValue(spacingTag, 'line'));
        const lineRule = getAttributeValue(spacingTag, 'lineRule');

        if (before) styleParts.push(`margin-top: ${before}px`);
        if (after) styleParts.push(`margin-bottom: ${after}px`);
        if (line) {
            styleParts.push(lineRule === 'exact'
                ? `line-height: ${twipToPx(line)}px`
                : `line-height: ${Math.max(1, line / 240).toFixed(2)}`);
        }
    }

    if (alignmentTag) {
        const alignment = getAttributeValue(alignmentTag, 'val');
        if (alignment === 'center') styleParts.push('text-align: center');
        if (alignment === 'right' || alignment === 'end') styleParts.push('text-align: right');
        if (alignment === 'both' || alignment === 'distribute') styleParts.push('text-align: justify');
    }

    if (paragraphBorders) {
        (['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
            const border = docxBorderToCss(getXmlChildTag(paragraphBorders, `w:${side}`));
            if (border) styleParts.push(`border-${side}: ${border}`);
        });
    }

    return styleParts;
}

function parseParagraphStyleDefinitions(stylesXml: string | null) {
    const styles = new Map<string, string[]>();
    if (!stylesXml?.trim()) return styles;

    getXmlBlocks(stylesXml, 'w:style').forEach((styleXml) => {
        const startTag = getXmlStartTag(styleXml, 'w:style');
        if (getAttributeValue(startTag, 'type') !== 'paragraph') return;

        const styleId = getAttributeValue(startTag, 'styleId');
        const paragraphProperties = getXmlChildBlock(styleXml, 'w:pPr');
        if (!styleId || !paragraphProperties) return;

        const styleParts = collectParagraphStyleFromProperties(paragraphProperties);
        if (styleParts.length > 0) styles.set(styleId, styleParts);
    });

    return styles;
}

/**
 * Extracts safe paragraph layout styles from DOCX XML in document order.
 */
export function extractParagraphStylesFromDocxXml(documentXml: string, stylesXml: string | null) {
    if (!documentXml.trim()) return [];

    const styleDefinitions = parseParagraphStyleDefinitions(stylesXml);

    return getXmlBlocks(documentXml, 'w:p').map((paragraphXml): ImportedDocxStyle | null => {
        const paragraphProperties = getXmlChildBlock(paragraphXml, 'w:pPr');
        const paragraphStyleId = getAttributeValue(getXmlChildTag(paragraphProperties, 'w:pStyle'), 'val');
        const styleParts = [
            ...(paragraphStyleId ? styleDefinitions.get(paragraphStyleId) ?? [] : []),
            ...collectParagraphStyleFromProperties(paragraphProperties),
        ];

        return styleParts.length > 0 ? { style: styleParts.join('; ') } : null;
    });
}

function collectTableCellStyleFromProperties(tableCellProperties: string): string[] {
    const styleParts: string[] = [];
    const borders = getXmlChildBlock(tableCellProperties, 'w:tcBorders');
    const shading = getXmlChildTag(tableCellProperties, 'w:shd');
    const margins = getXmlChildBlock(tableCellProperties, 'w:tcMar');

    if (borders) {
        (['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
            const border = docxBorderToCss(getXmlChildTag(borders, `w:${side}`));
            if (border) styleParts.push(`border-${side}: ${border}`);
        });
    }

    if (shading) {
        const fill = getAttributeValue(shading, 'fill');
        if (fill && fill !== 'auto') styleParts.push(`background-color: ${docxColorToCss(fill)}`);
    }

    if (margins) {
        (['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
            const marginTag = getXmlChildTag(margins, `w:${side}`);
            const width = twipToPx(getAttributeValue(marginTag, 'w'));
            if (width) styleParts.push(`padding-${side}: ${width}px`);
        });
    }

    return styleParts;
}

/**
 * Extracts table-cell borders, padding, and shading from DOCX XML.
 */
export function extractTableCellStylesFromDocxXml(documentXml: string) {
    if (!documentXml.trim()) return [];

    return getXmlBlocks(documentXml, 'w:tc').map((tableCellXml): ImportedDocxStyle | null => {
        const styleParts = collectTableCellStyleFromProperties(getXmlChildBlock(tableCellXml, 'w:tcPr'));
        return styleParts.length > 0 ? { style: styleParts.join('; ') } : null;
    });
}

export function annotateImportedDocxHtml(
    html: string,
    paragraphLayouts: ImportedParagraphLayout[],
    paragraphListStyles: Array<ImportedParagraphListStyle | null> = [],
    paragraphStyles: Array<ImportedDocxStyle | null> = [],
    tableCellStyles: Array<ImportedDocxStyle | null> = [],
) {
    if (!html.trim() || typeof DOMParser === 'undefined') {
        return html;
    }

    const parser = new DOMParser();
    const document = parser.parseFromString(html, 'text/html');
    const paragraphNodes = Array.from(document.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6'));
    const listNodes = Array.from(document.body.querySelectorAll('ul, ol'));
    const tableCellNodes = Array.from(document.body.querySelectorAll('td, th'));
    let paragraphListStyleIndex = 0;

    paragraphNodes.forEach((node, index) => {
        const layout = paragraphLayouts[index];
        const importedStyle = paragraphStyles[index]?.style;

        if (!layout || !hasLayout(layout)) {
            if (importedStyle) {
                node.setAttribute('data-imported-docx-style', importedStyle);
                node.setAttribute('style', mergeStyle(node.getAttribute('style'), importedStyle));
            }
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

        if (importedStyle) {
            node.setAttribute('data-imported-docx-style', importedStyle);
            styleParts.push(importedStyle);
        }

        if (styleParts.length > 0) {
            node.setAttribute('style', mergeStyle(node.getAttribute('style'), styleParts.join('; ')));
        }
    });

    listNodes.forEach((node) => {
        const expectedKind = node.tagName === 'OL' ? 'orderedList' : 'bulletList';

        while (
            paragraphListStyleIndex < paragraphListStyles.length &&
            paragraphListStyles[paragraphListStyleIndex]?.kind !== expectedKind
        ) {
            paragraphListStyleIndex += 1;
        }

        const listStyle = paragraphListStyles[paragraphListStyleIndex];
        paragraphListStyleIndex += 1;

        if (!listStyle || listStyle.kind !== expectedKind) {
            return;
        }

        node.setAttribute('data-list-style-type', listStyle.style);
        node.setAttribute('style', mergeStyle(node.getAttribute('style'), `list-style-type: ${listStyle.style}`));
    });

    tableCellNodes.forEach((node, index) => {
        const importedStyle = tableCellStyles[index]?.style;
        if (!importedStyle) return;

        node.setAttribute('data-imported-docx-style', importedStyle);
        node.setAttribute('style', mergeStyle(node.getAttribute('style'), importedStyle));
    });

    return document.body.innerHTML;
}
