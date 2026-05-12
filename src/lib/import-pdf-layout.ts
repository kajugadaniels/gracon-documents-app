import { normalizeParagraphLineHeight } from './document-layout-export-parity.ts';

const EDITOR_PRINTABLE_WIDTH_PX = 602;
const MIN_LINE_MERGE_TOLERANCE_PX = 2;
const GAP_SPACE_RATIO = 0.28;
const PARAGRAPH_GAP_RATIO = 1.72;
const INDENT_CONTINUATION_TOLERANCE_PX = 18;
const MIN_HEADING_FONT_SIZE_PX = 15;

export interface PdfTextSourceItem {
    str: string;
    transform: unknown[];
    width: number;
    height: number;
    fontName: string;
    hasEOL?: boolean;
}

export interface PdfTextSourceStyle {
    fontFamily?: string;
}

export interface PdfTextSourcePage {
    width: number;
    height: number;
    items: PdfTextSourceItem[];
    styles?: Record<string, PdfTextSourceStyle>;
}

interface PdfTextRun {
    text: string;
    x: number;
    y: number;
    width: number;
    fontSize: number;
    fontFamily: string | null;
    bold: boolean;
    italic: boolean;
}

interface PdfTextLine {
    runs: PdfTextRun[];
    x: number;
    y: number;
    fontSize: number;
    text: string;
}

interface PdfParagraph {
    lines: PdfTextLine[];
    leftIndent: number;
    fontSize: number;
    lineHeight: number | null;
}

type TiptapNode = {
    type: string;
    attrs?: Record<string, unknown>;
    content?: TiptapNode[];
    marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
    text?: string;
};

function getNumber(value: unknown, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getFontSize(item: PdfTextSourceItem) {
    const [, b, , d] = item.transform;
    const transformHeight = Math.hypot(getNumber(b), getNumber(d));
    return Math.max(1, item.height || transformHeight || 11);
}

function getFontTraits(fontName: string, fontFamily: string | undefined) {
    const source = `${fontName} ${fontFamily ?? ''}`.toLowerCase();

    return {
        bold: /\b(bold|black|heavy|semibold|semi-bold|demi)\b/.test(source),
        italic: /\b(italic|oblique)\b/.test(source),
    };
}

function createRun(item: PdfTextSourceItem, page: PdfTextSourcePage, scale: number): PdfTextRun | null {
    const text = item.str.replace(/\s+/g, ' ');
    if (!text.trim()) return null;

    const [, , , , rawX, rawY] = item.transform;
    const x = getNumber(rawX) * scale;
    const baselineY = getNumber(rawY);
    const fontSize = getFontSize(item) * scale;
    const y = (page.height - baselineY - fontSize) * scale;
    const fontFamily = page.styles?.[item.fontName]?.fontFamily?.replaceAll('"', '').replaceAll("'", '').trim() || null;
    const traits = getFontTraits(item.fontName, fontFamily ?? undefined);

    return {
        text,
        x,
        y,
        width: Math.max(0, item.width * scale),
        fontSize,
        fontFamily,
        bold: traits.bold,
        italic: traits.italic,
    };
}

function lineTolerance(run: PdfTextRun) {
    return Math.max(MIN_LINE_MERGE_TOLERANCE_PX, run.fontSize * 0.46);
}

function appendRunToLine(lines: PdfTextLine[], run: PdfTextRun) {
    const line = lines.find((candidate) => Math.abs(candidate.y - run.y) <= lineTolerance(run));

    if (!line) {
        lines.push({
            runs: [run],
            x: run.x,
            y: run.y,
            fontSize: run.fontSize,
            text: run.text,
        });
        return;
    }

    line.runs.push(run);
    line.x = Math.min(line.x, run.x);
    line.y = (line.y + run.y) / 2;
    line.fontSize = Math.max(line.fontSize, run.fontSize);
}

function compareRuns(left: PdfTextRun, right: PdfTextRun) {
    return left.x - right.x;
}

function finishLine(line: PdfTextLine): PdfTextLine {
    const runs = [...line.runs].sort(compareRuns);
    let text = '';

    runs.forEach((run, index) => {
        if (index > 0) {
            const previous = runs[index - 1];
            const previousRight = previous.x + previous.width;
            const gap = run.x - previousRight;

            if (
                gap > Math.max(previous.fontSize * GAP_SPACE_RATIO, 3)
                && !text.endsWith(' ')
                && !run.text.startsWith(' ')
            ) {
                text += ' ';
            }
        }

        text += run.text;
    });

    return {
        ...line,
        runs,
        x: Math.min(...runs.map((run) => run.x)),
        fontSize: Math.max(...runs.map((run) => run.fontSize)),
        text: text.trimEnd(),
    };
}

function collectLines(page: PdfTextSourcePage) {
    const scale = page.width > 0 ? EDITOR_PRINTABLE_WIDTH_PX / page.width : 1;
    const lines: PdfTextLine[] = [];

    page.items.forEach((item) => {
        const run = createRun(item, page, scale);
        if (run) appendRunToLine(lines, run);
    });

    return lines
        .map(finishLine)
        .filter((line) => line.text.trim())
        .sort((left, right) => left.y - right.y || left.x - right.x);
}

function getMedian(values: number[], fallback: number) {
    const sorted = values
        .filter((value) => Number.isFinite(value) && value > 0)
        .sort((left, right) => left - right);

    if (sorted.length === 0) return fallback;
    return sorted[Math.floor((sorted.length - 1) / 2)];
}

function shouldStartParagraph(previous: PdfTextLine, next: PdfTextLine, medianLineHeight: number) {
    const verticalGap = next.y - previous.y;
    const indentDelta = next.x - previous.x;
    const fontSizeRatio = Math.max(previous.fontSize, next.fontSize) / Math.max(1, Math.min(previous.fontSize, next.fontSize));

    return verticalGap > Math.max(medianLineHeight * PARAGRAPH_GAP_RATIO, previous.fontSize * 1.4)
        || (fontSizeRatio > 1.25 && verticalGap > Math.max(14, next.fontSize * 1.15))
        || indentDelta > INDENT_CONTINUATION_TOLERANCE_PX;
}

function createParagraph(lines: PdfTextLine[]): PdfParagraph {
    const fontSize = getMedian(lines.map((line) => line.fontSize), 11);
    const lineGaps = lines.slice(1).map((line, index) => line.y - lines[index].y);
    const medianGap = getMedian(lineGaps, fontSize * 1.25);

    return {
        lines,
        leftIndent: Math.max(0, Math.round(Math.min(...lines.map((line) => line.x)))),
        fontSize,
        lineHeight: lines.length > 1 ? normalizeParagraphLineHeight(medianGap / fontSize) : null,
    };
}

function collectParagraphs(lines: PdfTextLine[]) {
    if (lines.length === 0) return [];

    const lineGaps = lines.slice(1).map((line, index) => line.y - lines[index].y);
    const medianLineHeight = getMedian(lineGaps, getMedian(lines.map((line) => line.fontSize), 11) * 1.35);
    const paragraphs: PdfParagraph[] = [];
    let current: PdfTextLine[] = [lines[0]];

    for (let index = 1; index < lines.length; index += 1) {
        const previous = lines[index - 1];
        const next = lines[index];

        if (shouldStartParagraph(previous, next, medianLineHeight)) {
            paragraphs.push(createParagraph(current));
            current = [next];
        } else {
            current.push(next);
        }
    }

    paragraphs.push(createParagraph(current));
    return paragraphs;
}

function getHeadingLevel(paragraph: PdfParagraph, bodyFontSize: number) {
    if (paragraph.lines.length > 1 || paragraph.fontSize < MIN_HEADING_FONT_SIZE_PX) {
        return null;
    }

    if (paragraph.fontSize >= bodyFontSize * 1.75) return 1;
    if (paragraph.fontSize >= bodyFontSize * 1.38) return 2;
    if (paragraph.fontSize >= bodyFontSize * 1.18) return 3;
    return null;
}

function createMarks(run: PdfTextRun, bodyFontSize: number) {
    const marks: TiptapNode['marks'] = [];
    const textStyleAttrs: Record<string, unknown> = {};
    const pointSize = Math.round(run.fontSize * 0.75 * 10) / 10;

    if (run.bold) marks.push({ type: 'bold' });
    if (run.italic) marks.push({ type: 'italic' });
    if (Math.abs(run.fontSize - bodyFontSize) > 0.8) {
        textStyleAttrs.fontSize = `${pointSize}pt`;
    }
    if (run.fontFamily) {
        textStyleAttrs.fontFamily = run.fontFamily;
    }
    if (Object.keys(textStyleAttrs).length > 0) {
        marks.push({ type: 'textStyle', attrs: textStyleAttrs });
    }

    return marks.length > 0 ? marks : undefined;
}

function createLineContent(line: PdfTextLine, bodyFontSize: number) {
    const content: TiptapNode[] = [];

    line.runs.forEach((run, index) => {
        if (index > 0) {
            const previous = line.runs[index - 1];
            const previousRight = previous.x + previous.width;
            const gap = run.x - previousRight;

            if (
                gap > Math.max(previous.fontSize * GAP_SPACE_RATIO, 3)
                && !content.at(-1)?.text?.endsWith(' ')
                && !run.text.startsWith(' ')
            ) {
                content.push({ type: 'text', text: ' ' });
            }
        }

        content.push({
            type: 'text',
            text: run.text,
            marks: createMarks(run, bodyFontSize),
        });
    });

    return content;
}

function createParagraphNode(paragraph: PdfParagraph, bodyFontSize: number): TiptapNode {
    const level = getHeadingLevel(paragraph, bodyFontSize);
    const attrs: Record<string, unknown> = {
        leftIndent: paragraph.leftIndent,
        firstLineIndent: 0,
        tabStops: [],
    };

    if (paragraph.lineHeight !== null) {
        attrs.lineHeight = paragraph.lineHeight;
    }
    if (level) {
        attrs.level = level;
    }

    const content = paragraph.lines.flatMap((line, index) => {
        const lineContent = createLineContent(line, bodyFontSize);
        return index === 0 ? lineContent : [{ type: 'hardBreak' }, ...lineContent];
    });

    return {
        type: level ? 'heading' : 'paragraph',
        attrs,
        content: content.length > 0 ? content : undefined,
    };
}

export function convertPdfPagesToTiptapContent(pages: PdfTextSourcePage[]): Record<string, unknown> {
    const pageLines = pages.map(collectLines);
    const paragraphs = pageLines.flatMap((lines) => collectParagraphs(lines));
    const bodyFontSize = getMedian(
        paragraphs.flatMap((paragraph) => paragraph.lines.map((line) => line.fontSize)),
        11,
    );
    const content: TiptapNode[] = [];

    pageLines.forEach((lines, pageIndex) => {
        collectParagraphs(lines).forEach((paragraph) => {
            content.push(createParagraphNode(paragraph, bodyFontSize));
        });

        if (pageIndex < pageLines.length - 1 && content.length > 0) {
            content.push({ type: 'paragraph' });
        }
    });

    return {
        type: 'doc',
        content: content.length > 0 ? content : [{ type: 'paragraph' }],
    };
}
