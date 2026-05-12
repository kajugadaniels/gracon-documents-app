/**
 * Direct DOCX XML importer for higher-fidelity Gracon editor documents.
 *
 * Mammoth remains useful as a fallback, but this parser gives Gracon direct
 * control over Word paragraphs, runs, tables, lists, and layout attributes so
 * imported documents behave like native TipTap content instead of lossy HTML.
 */
import type { JSONContent } from '@tiptap/core';
import { normalizeBulletListStyle, normalizeOrderedListStyle } from '@/constants';
import { normalizeEditorLinkUrl } from '@/lib/editor-link';
import {
    extractParagraphListStylesFromDocxXml,
    extractParagraphStylesFromDocxXml,
    extractParagraphTabStopsFromDocumentXml,
    extractTableCellStylesFromDocxXml,
    twipToPx,
    type ImportedParagraphListStyle,
    type ImportedParagraphTabStop,
} from '@/lib/import-docx-layout';

interface DocxXmlParts {
    documentXml: string | null;
    numberingXml: string | null;
    relationshipsXml: string | null;
    stylesXml: string | null;
}

interface RunStyle {
    bold?: boolean;
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    highlight?: string;
    italic?: boolean;
    strike?: boolean;
    underline?: boolean;
}

interface ParagraphContext {
    paragraphIndex: number;
    relationshipTargets: Map<string, string>;
    runStyles: Map<string, RunStyle>;
}

interface ListAccumulator {
    kind: ImportedParagraphListStyle['kind'];
    style: ImportedParagraphListStyle['style'];
    items: JSONContent[];
}

const LINK_MARK_ATTRS = {
    target: '_blank',
    rel: 'noopener noreferrer nofollow',
};

function parseXml(xml: string | null) {
    if (!xml?.trim() || typeof DOMParser === 'undefined') return null;
    return new DOMParser().parseFromString(xml, 'application/xml');
}

function getLocalName(element: Element) {
    return element.localName || element.nodeName.split(':').pop() || element.nodeName;
}

function getAttr(element: Element | null, name: string) {
    if (!element) return null;

    for (const attr of Array.from(element.attributes)) {
        if ((attr.localName || attr.name.split(':').pop()) === name) {
            return attr.value;
        }
    }

    return null;
}

function getChildElements(element: Element, localName?: string) {
    return Array.from(element.children).filter((child) => (
        !localName || getLocalName(child) === localName
    ));
}

function getFirstChild(element: Element | null, localName: string) {
    if (!element) return null;
    return getChildElements(element, localName)[0] ?? null;
}

function getDescendants(element: Element, localName: string) {
    return Array.from(element.getElementsByTagNameNS('*', localName));
}

function getBooleanProperty(properties: Element | null, localName: string) {
    const element = getFirstChild(properties, localName);
    if (!element) return false;

    const value = getAttr(element, 'val');
    return value !== 'false' && value !== '0' && value !== 'off';
}

function getParagraphStyleId(paragraph: Element) {
    const paragraphProperties = getFirstChild(paragraph, 'pPr');
    return getAttr(getFirstChild(paragraphProperties, 'pStyle'), 'val') ?? '';
}

function getParagraphNodeType(paragraph: Element, styleNames: Map<string, string>) {
    const styleId = getParagraphStyleId(paragraph);
    const styleName = styleNames.get(styleId) ?? styleId;
    const normalized = styleName.replace(/\s+/g, '').toLowerCase();
    const headingMatch = normalized.match(/^heading([1-6])$/);

    if (headingMatch) {
        return { type: 'heading', attrs: { level: Number.parseInt(headingMatch[1], 10) } };
    }

    if (normalized === 'title') return { type: 'heading', attrs: { level: 1 } };
    if (normalized === 'subtitle') return { type: 'heading', attrs: { level: 2 } };

    return { type: 'paragraph', attrs: {} };
}

function parseStyleNames(stylesDocument: Document | null) {
    const styleNames = new Map<string, string>();
    if (!stylesDocument) return styleNames;

    getDescendants(stylesDocument.documentElement, 'style').forEach((style) => {
        const styleId = getAttr(style, 'styleId');
        const name = getAttr(getFirstChild(style, 'name'), 'val');
        if (styleId && name) styleNames.set(styleId, name);
    });

    return styleNames;
}

function parseRunStyles(stylesDocument: Document | null) {
    const runStyles = new Map<string, RunStyle>();
    if (!stylesDocument) return runStyles;

    getDescendants(stylesDocument.documentElement, 'style').forEach((style) => {
        if (getAttr(style, 'type') !== 'character') return;

        const styleId = getAttr(style, 'styleId');
        const runProperties = getFirstChild(style, 'rPr');
        if (!styleId || !runProperties) return;

        runStyles.set(styleId, parseRunStyle(runProperties, new Map()));
    });

    return runStyles;
}

function parseRelationshipTargets(relationshipsDocument: Document | null) {
    const relationshipTargets = new Map<string, string>();
    if (!relationshipsDocument) return relationshipTargets;

    getDescendants(relationshipsDocument.documentElement, 'Relationship').forEach((relationship) => {
        const id = getAttr(relationship, 'Id');
        const target = getAttr(relationship, 'Target');
        const type = getAttr(relationship, 'Type') ?? '';
        const normalized = target ? normalizeEditorLinkUrl(target) : null;

        if (id && normalized?.ok && type.includes('/hyperlink')) {
            relationshipTargets.set(id, normalized.url);
        }
    });

    return relationshipTargets;
}

function docxColorToCss(value: string | null) {
    if (!value || value === 'auto') return null;
    return /^([0-9a-f]{6})$/i.test(value) ? `#${value}` : null;
}

function docxHighlightToCss(value: string | null) {
    if (!value || value === 'none') return null;

    const colors: Record<string, string> = {
        black: '#000000',
        blue: '#0000FF',
        cyan: '#00FFFF',
        green: '#008000',
        magenta: '#FF00FF',
        red: '#FF0000',
        yellow: '#FFFF00',
    };

    return colors[value] ?? null;
}

function getRunFontFamily(runProperties: Element | null) {
    const fonts = getFirstChild(runProperties, 'rFonts');
    return getAttr(fonts, 'ascii') ?? getAttr(fonts, 'hAnsi') ?? getAttr(fonts, 'cs') ?? undefined;
}

function getRunFontSize(runProperties: Element | null) {
    const size = getAttr(getFirstChild(runProperties, 'sz'), 'val');
    if (!size) return undefined;

    const halfPoints = Number.parseFloat(size);
    return Number.isFinite(halfPoints) && halfPoints > 0 ? `${halfPoints / 2}pt` : undefined;
}

function parseRunStyle(runProperties: Element | null, runStyles: Map<string, RunStyle>): RunStyle {
    if (!runProperties) return {};

    const styleId = getAttr(getFirstChild(runProperties, 'rStyle'), 'val');
    const inherited = styleId ? runStyles.get(styleId) ?? {} : {};
    const color = docxColorToCss(getAttr(getFirstChild(runProperties, 'color'), 'val'));
    const highlight = docxHighlightToCss(getAttr(getFirstChild(runProperties, 'highlight'), 'val'));

    return {
        ...inherited,
        bold: inherited.bold || getBooleanProperty(runProperties, 'b'),
        color: color ?? inherited.color,
        fontFamily: getRunFontFamily(runProperties) ?? inherited.fontFamily,
        fontSize: getRunFontSize(runProperties) ?? inherited.fontSize,
        highlight: highlight ?? inherited.highlight,
        italic: inherited.italic || getBooleanProperty(runProperties, 'i'),
        strike: inherited.strike || getBooleanProperty(runProperties, 'strike') || getBooleanProperty(runProperties, 'dstrike'),
        underline: inherited.underline || Boolean(getFirstChild(runProperties, 'u')),
    };
}

function createMarks(style: RunStyle, href?: string) {
    const marks: NonNullable<JSONContent['marks']> = [];

    if (style.bold) marks.push({ type: 'bold' });
    if (style.italic) marks.push({ type: 'italic' });
    if (style.underline) marks.push({ type: 'underline' });
    if (style.strike) marks.push({ type: 'strike' });

    const textStyleAttrs: Record<string, string> = {};
    if (style.color) textStyleAttrs.color = style.color;
    if (style.fontFamily) textStyleAttrs.fontFamily = style.fontFamily;
    if (style.fontSize) textStyleAttrs.fontSize = style.fontSize;
    if (style.highlight) textStyleAttrs.backgroundColor = style.highlight;
    if (Object.keys(textStyleAttrs).length > 0) {
        marks.push({ type: 'textStyle', attrs: textStyleAttrs });
    }

    if (href) marks.push({ type: 'link', attrs: { ...LINK_MARK_ATTRS, href } });

    return marks.length > 0 ? marks : undefined;
}

function createTextNode(text: string, style: RunStyle, href?: string): JSONContent | null {
    if (!text) return null;

    const marks = createMarks(style, href);
    return marks ? { type: 'text', text, marks } : { type: 'text', text };
}

function parseRun(run: Element, context: ParagraphContext, href?: string) {
    const style = parseRunStyle(getFirstChild(run, 'rPr'), context.runStyles);
    const content: JSONContent[] = [];

    getChildElements(run).forEach((child) => {
        const localName = getLocalName(child);

        if (localName === 't') {
            const node = createTextNode(child.textContent ?? '', style, href);
            if (node) content.push(node);
        } else if (localName === 'tab') {
            const node = createTextNode('\t', style, href);
            if (node) content.push(node);
        } else if (localName === 'br') {
            content.push({ type: 'hardBreak' });
        }
    });

    return content;
}

function parseParagraphInlineContent(paragraph: Element, context: ParagraphContext) {
    return getChildElements(paragraph).flatMap((child): JSONContent[] => {
        const localName = getLocalName(child);

        if (localName === 'r') return parseRun(child, context);
        if (localName !== 'hyperlink') return [];

        const relationshipId = getAttr(child, 'id');
        const anchor = getAttr(child, 'anchor');
        const href = relationshipId
            ? context.relationshipTargets.get(relationshipId)
            : anchor ? `#${anchor}` : undefined;

        return getDescendants(child, 'r').flatMap((run) => parseRun(run, context, href));
    });
}

function getParagraphLayout(paragraph: Element, tabStops: ImportedParagraphTabStop[]) {
    const paragraphProperties = getFirstChild(paragraph, 'pPr');
    const indent = getFirstChild(paragraphProperties, 'ind');
    const leftIndent = twipToPx(getAttr(indent, 'start') ?? getAttr(indent, 'left'));
    const firstLineIndent = twipToPx(getAttr(indent, 'firstLine')) - twipToPx(getAttr(indent, 'hanging'));

    return {
        firstLineIndent,
        leftIndent,
        tabStops,
    };
}

function mergeAttrs(...entries: Array<Record<string, unknown>>) {
    return entries.reduce<Record<string, unknown>>((attrs, entry) => {
        Object.entries(entry).forEach(([key, value]) => {
            const isEmptyArray = Array.isArray(value) && value.length === 0;
            if (value === null || value === undefined || value === '' || isEmptyArray) return;
            attrs[key] = value;
        });

        return attrs;
    }, {});
}

function createParagraphNode(
    paragraph: Element,
    context: ParagraphContext,
    styleNames: Map<string, string>,
    tabStops: ImportedParagraphTabStop[],
    importedStyle?: string,
) {
    const nodeType = getParagraphNodeType(paragraph, styleNames);
    const layout = getParagraphLayout(paragraph, tabStops);
    const attrs = mergeAttrs(
        nodeType.attrs,
        {
            firstLineIndent: layout.firstLineIndent,
            importedDocxStyle: importedStyle,
            leftIndent: layout.leftIndent,
            tabStops: layout.tabStops,
        },
    );
    const content = parseParagraphInlineContent(paragraph, context);

    return {
        type: nodeType.type,
        ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
        ...(content.length > 0 ? { content } : {}),
    };
}

function createListNode(accumulator: ListAccumulator): JSONContent {
    const listStyleType = accumulator.kind === 'bulletList'
        ? normalizeBulletListStyle(accumulator.style)
        : normalizeOrderedListStyle(accumulator.style);

    return {
        type: accumulator.kind,
        attrs: { listStyleType },
        content: accumulator.items,
    };
}

function parseTableCell(
    cell: Element,
    context: ParagraphContext,
    styleNames: Map<string, string>,
    paragraphTabStops: ImportedParagraphTabStop[][],
    paragraphStyles: Array<{ style: string } | null>,
    tableCellStyle: string | undefined,
    type: 'tableCell' | 'tableHeader',
) {
    const content = getChildElements(cell)
        .filter((child) => getLocalName(child) === 'p')
        .map((paragraph) => {
            const index = context.paragraphIndex;
            context.paragraphIndex += 1;
            return createParagraphNode(
                paragraph,
                context,
                styleNames,
                paragraphTabStops[index] ?? [],
                paragraphStyles[index]?.style,
            );
        });

    return {
        type,
        ...(tableCellStyle ? { attrs: { importedDocxStyle: tableCellStyle } } : {}),
        content: content.length > 0 ? content : [{ type: 'paragraph' }],
    };
}

function parseTable(
    table: Element,
    context: ParagraphContext,
    styleNames: Map<string, string>,
    paragraphTabStops: ImportedParagraphTabStop[][],
    paragraphStyles: Array<{ style: string } | null>,
    tableCellStyles: Array<{ style: string } | null>,
    tableCellIndexRef: { current: number },
) {
    const rows = getChildElements(table, 'tr').map((row) => {
        const isHeaderRow = Boolean(getFirstChild(getFirstChild(row, 'trPr'), 'tblHeader'));
        const cells = getChildElements(row, 'tc').map((cell) => {
            const style = tableCellStyles[tableCellIndexRef.current]?.style;
            tableCellIndexRef.current += 1;

            return parseTableCell(
                cell,
                context,
                styleNames,
                paragraphTabStops,
                paragraphStyles,
                style,
                isHeaderRow ? 'tableHeader' : 'tableCell',
            );
        });

        return { type: 'tableRow', content: cells.length > 0 ? cells : [{ type: 'tableCell', content: [{ type: 'paragraph' }] }] };
    });

    return rows.length > 0 ? { type: 'table', content: rows } : null;
}

/**
 * Converts DOCX XML parts directly into TipTap JSON.
 *
 * @param parts - DOCX XML parts read from the zipped file.
 * @returns TipTap JSON when direct parsing succeeds, otherwise `null`.
 */
export function importDocxXmlToTiptap(parts: DocxXmlParts): JSONContent | null {
    const documentXml = parts.documentXml;
    if (!documentXml?.trim()) return null;

    const document = parseXml(documentXml);
    if (!document) return null;

    const body = getDescendants(document.documentElement, 'body')[0];
    if (!body) return null;

    const stylesDocument = parseXml(parts.stylesXml);
    const styleNames = parseStyleNames(stylesDocument);
    const context: ParagraphContext = {
        paragraphIndex: 0,
        relationshipTargets: parseRelationshipTargets(parseXml(parts.relationshipsXml)),
        runStyles: parseRunStyles(stylesDocument),
    };
    const paragraphListStyles = extractParagraphListStylesFromDocxXml(documentXml, parts.numberingXml);
    const paragraphStyles = extractParagraphStylesFromDocxXml(documentXml, parts.stylesXml);
    const paragraphTabStops = extractParagraphTabStopsFromDocumentXml(documentXml);
    const tableCellStyles = extractTableCellStylesFromDocxXml(documentXml);
    const tableCellIndexRef = { current: 0 };
    const content: JSONContent[] = [];
    let listAccumulator: ListAccumulator | null = null;

    function flushList() {
        if (!listAccumulator) return;
        content.push(createListNode(listAccumulator));
        listAccumulator = null;
    }

    getChildElements(body).forEach((child) => {
        const localName = getLocalName(child);

        if (localName === 'p') {
            const index = context.paragraphIndex;
            const paragraphNode = createParagraphNode(
                child,
                context,
                styleNames,
                paragraphTabStops[index] ?? [],
                paragraphStyles[index]?.style,
            );
            const listStyle = paragraphListStyles[index];
            context.paragraphIndex += 1;

            if (listStyle) {
                if (
                    !listAccumulator ||
                    listAccumulator.kind !== listStyle.kind ||
                    listAccumulator.style !== listStyle.style
                ) {
                    flushList();
                    listAccumulator = {
                        kind: listStyle.kind,
                        style: listStyle.style,
                        items: [],
                    };
                }

                listAccumulator.items.push({ type: 'listItem', content: [paragraphNode] });
                return;
            }

            flushList();
            content.push(paragraphNode);
        } else if (localName === 'tbl') {
            flushList();
            const table = parseTable(
                child,
                context,
                styleNames,
                paragraphTabStops,
                paragraphStyles,
                tableCellStyles,
                tableCellIndexRef,
            );
            if (table) content.push(table);
        }
    });

    flushList();

    return content.length > 0 ? { type: 'doc', content } : null;
}
