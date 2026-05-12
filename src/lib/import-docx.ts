/**
 * import-docx.ts
 *
 * Converts imported office files into TipTap JSON.
 *
 * DOCX files use mammoth for DOCX → HTML, then TipTap's generateJSON.
 * PDF files use pdf.js text extraction and become editable paragraphs.
 *
 * Only the extensions registered in the editor are included here so that the
 * resulting JSON is always valid for the current schema. Unsupported formatting
 * (custom fonts, images, text boxes) is silently dropped — this matches the
 * behaviour of Google Docs and Notion imports.
 */

import { generateJSON } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, FontFamily } from '@tiptap/extension-text-style';
import { FontSize } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { ListStyleExtension } from '@/components/editor/list-style-extension';
import { ParagraphLayoutExtension } from '@/components/editor/paragraph-layout-extension';
import { SignatureBlockExtension } from '@/components/editor/signature-block-extension';
import { ImportedDocxStyleExtension } from '@/components/editor/imported-docx-style-extension';
import { normalizeEditorLinkUrl } from '@/lib/editor-link';
import {
    annotateImportedDocxHtml,
    collectImportedParagraphLayouts,
    extractParagraphListStylesFromDocxXml,
    extractParagraphStylesFromDocxXml,
    extractParagraphTabStopsFromDocumentXml,
    extractTableCellStylesFromDocxXml,
    mergeParagraphTabStopsIntoLayouts,
} from '@/lib/import-docx-layout';

/**
 * The subset of TipTap extensions used when parsing imported HTML.
 * Must stay in sync with the extensions list in RichTextEditor.tsx.
 * Placeholder and CharacterCount are output-only — they don't affect parsing.
 */
const IMPORT_EXTENSIONS = [
    StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: { languageClassPrefix: 'language-' },
        link: false,
    }),
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Highlight.configure({ multicolor: false }),
    Image.configure({
        allowBase64: false,
        inline: false,
        HTMLAttributes: {
            loading: 'lazy',
            decoding: 'async',
        },
    }),
    Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
        isAllowedUri: (url) => normalizeEditorLinkUrl(url ?? '').ok,
        HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer nofollow',
        },
    }),
    ListStyleExtension,
    ParagraphLayoutExtension,
    ImportedDocxStyleExtension,
    SignatureBlockExtension,
];

/**
 * Style map rules passed to mammoth.
 * These map Word paragraph styles to semantic HTML so TipTap can parse them
 * correctly. Alignment styles are preserved via inline HTML attributes.
 */
const MAMMOTH_STYLE_MAP = [
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Heading 4'] => h4:fresh",
    "p[style-name='Heading 5'] => h5:fresh",
    "p[style-name='Heading 6'] => h6:fresh",
    "p[style-name='Title']     => h1:fresh",
    "p[style-name='Subtitle']  => h2:fresh",
];

export interface ImportResult {
    /** TipTap-compatible JSON document. */
    content: Record<string, unknown>;
    /** Suggested document title derived from the filename. */
    title: string;
}

interface PdfTextItem {
    str?: string;
    transform?: number[];
}

interface PdfLine {
    y: number;
    items: Array<{ x: number; text: string }>;
}

function getImportedDocumentTitle(file: File) {
    return file.name
        .replace(/\.(docx?|pdf)$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim() || 'Imported Document';
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function textLinesToHtml(lines: string[]) {
    return lines
        .filter((line) => line.trim().length > 0)
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join('');
}

async function readXmlPartsFromDocx(arrayBuffer: ArrayBuffer) {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(arrayBuffer);
    const documentXml = zip.file('word/document.xml');
    const numberingXml = zip.file('word/numbering.xml');
    const stylesXml = zip.file('word/styles.xml');

    return {
        documentXml: documentXml ? await documentXml.async('text') : null,
        numberingXml: numberingXml ? await numberingXml.async('text') : null,
        stylesXml: stylesXml ? await stylesXml.async('text') : null,
    };
}

/**
 * Converts a .docx File to a TipTap JSON document.
 *
 * Mammoth is dynamically imported so it stays out of the initial JS bundle
 * — it only loads when the user actually triggers a file import.
 *
 * @throws {Error} If the file is not a .docx, cannot be read, or cannot be parsed.
 */
export async function importDocxToTiptap(file: File): Promise<ImportResult> {
    if (!file.name.match(/\.docx?$/i)) {
        throw new Error('Only .docx files are supported.');
    }

    // Dynamic import keeps mammoth (~500 kB) out of the initial bundle.
    const mammoth = await import('mammoth');

    const arrayBuffer = await file.arrayBuffer();
    const { documentXml, numberingXml, stylesXml } = await readXmlPartsFromDocx(arrayBuffer);
    const paragraphTabStops = documentXml
        ? extractParagraphTabStopsFromDocumentXml(documentXml)
        : [];
    const paragraphListStyles = documentXml
        ? extractParagraphListStylesFromDocxXml(documentXml, numberingXml)
        : [];
    const paragraphStyles = documentXml
        ? extractParagraphStylesFromDocxXml(documentXml, stylesXml)
        : [];
    const tableCellStyles = documentXml
        ? extractTableCellStylesFromDocxXml(documentXml)
        : [];

    let paragraphLayouts = collectImportedParagraphLayouts(null);

    const { value: rawHtml } = await mammoth.convertToHtml(
        { arrayBuffer },
        {
            styleMap: MAMMOTH_STYLE_MAP,
            transformDocument: (document) => {
                paragraphLayouts = mergeParagraphTabStopsIntoLayouts(
                    collectImportedParagraphLayouts(document),
                    paragraphTabStops,
                );
                return document;
            },
        },
    );
    const html = annotateImportedDocxHtml(
        rawHtml,
        paragraphLayouts,
        paragraphListStyles,
        paragraphStyles,
        tableCellStyles,
    );

    if (!html.trim()) {
        throw new Error('The document appears to be empty or could not be parsed.');
    }

    const content = generateJSON(html, IMPORT_EXTENSIONS) as Record<string, unknown>;

    const title = getImportedDocumentTitle(file);

    return { content, title };
}

function findLine(lines: PdfLine[], y: number) {
    return lines.find((line) => Math.abs(line.y - y) <= 3);
}

function collectPageLines(items: PdfTextItem[]) {
    const lines: PdfLine[] = [];

    for (const item of items) {
        const text = item.str?.replace(/\s+/g, ' ').trim();
        const transform = item.transform;

        if (!text || !transform || transform.length < 6) continue;

        const x = transform[4] ?? 0;
        const y = transform[5] ?? 0;
        const line = findLine(lines, y);

        if (line) {
            line.items.push({ x, text });
        } else {
            lines.push({ y, items: [{ x, text }] });
        }
    }

    return lines
        .sort((a, b) => b.y - a.y)
        .map((line) =>
            line.items
                .sort((a, b) => a.x - b.x)
                .map((item) => item.text)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim(),
        )
        .filter(Boolean);
}

/**
 * Converts a text-based PDF File to editable TipTap paragraphs.
 *
 * This intentionally imports selectable PDF text. Scanned/image-only PDFs do
 * not contain text content, so they need OCR before they can become editable.
 */
export async function importPdfToTiptap(file: File): Promise<ImportResult> {
    if (!file.name.match(/\.pdf$/i)) {
        throw new Error('Only .pdf files are supported.');
    }

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.mjs',
        import.meta.url,
    ).toString();
    const arrayBuffer = await file.arrayBuffer();
    const documentTask = pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
        useWorkerFetch: false,
    });
    const pdfDocument = await documentTask.promise;
    const lines: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageLines = collectPageLines(textContent.items as PdfTextItem[]);

        if (pageLines.length > 0) {
            if (lines.length > 0) lines.push('');
            lines.push(...pageLines);
        }
    }

    const html = textLinesToHtml(lines);

    if (!html.trim()) {
        throw new Error('This PDF has no selectable text. Use an OCR version, then import again.');
    }

    return {
        content: generateJSON(html, IMPORT_EXTENSIONS) as Record<string, unknown>,
        title: getImportedDocumentTitle(file),
    };
}

/**
 * Imports a supported document file into editable TipTap JSON.
 */
export async function importFileToTiptap(file: File): Promise<ImportResult> {
    if (file.name.match(/\.pdf$/i) || file.type === 'application/pdf') {
        return importPdfToTiptap(file);
    }

    if (file.name.match(/\.docx?$/i)) {
        return importDocxToTiptap(file);
    }

    throw new Error('Only .docx, .doc, and text-based .pdf files are supported.');
}
