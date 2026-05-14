'use client';

/**
 * Client-side rendered document export.
 *
 * The live editor can be responsive, so export captures an isolated A4 clone
 * with fixed paper geometry. That keeps PDF/DOCX output aligned with the
 * document paper constants instead of the user's current viewport width.
 */
import {
    A4_PAPER_HEIGHT_PT,
    A4_PAPER_WIDTH_PT,
} from '@/constants/document-paper';
import { createEditableDocxBlob } from './export-document-docx';
import { captureRenderedDocumentPages } from './export-document-capture';

type ExportFormat = 'pdf' | 'docx';

function sanitizeFileName(title: string, extension: string) {
    const safeTitle = title
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'Untitled Document';

    return `${safeTitle}.${extension}`;
}

function downloadBlob(blob: Blob, fileName: string) {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
}

function canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to generate export file.'));
                return;
            }
            resolve(blob);
        }, 'image/png');
    });
}

async function blobToUint8Array(blob: Blob) {
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
}

function toPlainArrayBuffer(bytes: Uint8Array<ArrayBufferLike>) {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}

/**
 * Saves already-rendered A4 page canvases into a downloadable PDF.
 */
export async function saveCanvasPagesAsPdf(pages: HTMLCanvasElement[], title: string) {
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.create();

    for (const pageCanvas of pages) {
        const pageBlob = await canvasToBlob(pageCanvas);
        const pageBytes = await blobToUint8Array(pageBlob);
        const image = await pdf.embedPng(pageBytes);
        const page = pdf.addPage([A4_PAPER_WIDTH_PT, A4_PAPER_HEIGHT_PT]);

        page.drawImage(image, {
            x: 0,
            y: 0,
            width: A4_PAPER_WIDTH_PT,
            height: A4_PAPER_HEIGHT_PT,
        });
    }

    const pdfBytes = await pdf.save();
    downloadBlob(
        new Blob([toPlainArrayBuffer(pdfBytes)], { type: 'application/pdf' }),
        sanitizeFileName(title, 'pdf'),
    );
}

/**
 * Saves the currently rendered document sheet as a PDF or DOCX download.
 */
export async function saveRenderedDocumentAs(
    format: ExportFormat,
    title: string,
    exportRootEl: HTMLElement,
) {
    if (format === 'pdf') {
        const pages = await captureRenderedDocumentPages(exportRootEl);
        await saveCanvasPagesAsPdf(pages, title);
        return;
    }

    const blob = await createEditableDocxBlob(exportRootEl);
    downloadBlob(blob, sanitizeFileName(title, 'docx'));
}
