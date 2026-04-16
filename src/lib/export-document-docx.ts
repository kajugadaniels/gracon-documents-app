/**
 * Builds editable DOCX files from the rendered document editor.
 *
 * The PDF exporter intentionally captures pixels, but DOCX export must preserve
 * user data as Word paragraphs, tables, lists, and inline text formatting.
 */
'use client';

import {
    createDocxPageProperties,
} from '@/lib/document-layout-export-parity';
import { readDocumentLayoutFromElement } from '@/lib/document-layout';
import { convertEditorDomToDocxChildren } from './export-document-docx-dom';

type DocxModule = typeof import('docx');
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

function createPageProperties(sheetEl: HTMLElement) {
    const layout = readDocumentLayoutFromElement(sheetEl);

    return createDocxPageProperties(layout);
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
                properties: createPageProperties(sheetEl),
                children,
            },
        ],
    });

    return docx.Packer.toBlob(document);
}
