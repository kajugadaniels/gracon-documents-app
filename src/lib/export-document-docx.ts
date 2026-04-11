/**
 * Builds editable DOCX files from the rendered document editor.
 *
 * The PDF exporter intentionally captures pixels, but DOCX export must preserve
 * user data as Word paragraphs, tables, lists, and inline text formatting.
 */
'use client';

import {
    A4_PAPER_HEIGHT_TWIP,
    A4_PAPER_MARGIN_PX,
    A4_PAPER_WIDTH_TWIP,
} from '@/constants/document-paper';
import { convertEditorDomToDocxChildren } from './export-document-docx-dom';

type DocxModule = typeof import('docx');

const CSS_PX_TO_TWIP = 15;
const DOCX_PAGE_MARGIN_TWIP = A4_PAPER_MARGIN_PX * CSS_PX_TO_TWIP;

function getEditorElement(sheetEl: HTMLElement) {
    const editorEl = sheetEl.querySelector('.ProseMirror');
    if (!(editorEl instanceof HTMLElement)) {
        throw new Error('Could not find editable document content for DOCX export.');
    }

    return editorEl;
}

function createNumberingLevels(docx: DocxModule, format: 'bullet' | 'decimal') {
    return Array.from({ length: 6 }, (_, level) => ({
        level,
        format: format === 'bullet' ? docx.LevelFormat.BULLET : docx.LevelFormat.DECIMAL,
        text: format === 'bullet' ? '•' : `%${level + 1}.`,
        alignment: docx.AlignmentType.LEFT,
        suffix: docx.LevelSuffix.TAB,
        style: {
            paragraph: {
                indent: {
                    left: 720 + level * 360,
                    hanging: 360,
                },
            },
        },
    }));
}

function createNumberingConfig(docx: DocxModule) {
    return {
        config: [
            {
                reference: 'bullet-list',
                levels: createNumberingLevels(docx, 'bullet'),
            },
            {
                reference: 'ordered-list',
                levels: createNumberingLevels(docx, 'decimal'),
            },
        ],
    };
}

function createPageProperties() {
    return {
        page: {
            size: {
                width: A4_PAPER_WIDTH_TWIP,
                height: A4_PAPER_HEIGHT_TWIP,
            },
            margin: {
                top: DOCX_PAGE_MARGIN_TWIP,
                right: DOCX_PAGE_MARGIN_TWIP,
                bottom: DOCX_PAGE_MARGIN_TWIP,
                left: DOCX_PAGE_MARGIN_TWIP,
                header: 0,
                footer: 0,
                gutter: 0,
            },
        },
    };
}

/**
 * Creates an editable DOCX blob from the live document paper element.
 */
export async function createEditableDocxBlob(sheetEl: HTMLElement) {
    const docx = await import('docx');
    const editorEl = getEditorElement(sheetEl);
    const children = convertEditorDomToDocxChildren(editorEl, docx);
    const document = new docx.Document({
        numbering: createNumberingConfig(docx),
        sections: [
            {
                properties: createPageProperties(),
                children,
            },
        ],
    });

    return docx.Packer.toBlob(document);
}
