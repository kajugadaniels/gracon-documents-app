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
    A4_PAPER_HEIGHT_PX,
    A4_PAPER_HEIGHT_TWIP,
    A4_PAPER_WIDTH_PT,
    A4_PAPER_WIDTH_PX,
    A4_PAPER_WIDTH_TWIP,
} from '@/constants/document-paper';
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

async function exportPdf(pages: HTMLCanvasElement[], title: string) {
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

async function exportDocx(pages: HTMLCanvasElement[], title: string) {
    const { Document, Packer, Paragraph, ImageRun } = await import('docx');

    const sections = await Promise.all(
        pages.map(async (pageCanvas) => {
            const pageBlob = await canvasToBlob(pageCanvas);
            const pageBytes = await blobToUint8Array(pageBlob);

            return {
                properties: {
                    page: {
                        size: { width: A4_PAPER_WIDTH_TWIP, height: A4_PAPER_HEIGHT_TWIP },
                        margin: {
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            header: 0,
                            footer: 0,
                            gutter: 0,
                        },
                    },
                },
                children: [
                    new Paragraph({
                        spacing: { before: 0, after: 0 },
                        children: [
                            new ImageRun({
                                type: 'png',
                                data: pageBytes,
                                transformation: {
                                    width: A4_PAPER_WIDTH_PX,
                                    height: A4_PAPER_HEIGHT_PX,
                                },
                            }),
                        ],
                    }),
                ],
            };
        }),
    );

    const doc = new Document({ sections });
    const blob = await Packer.toBlob(doc);

    downloadBlob(
        blob,
        sanitizeFileName(title, 'docx'),
    );
}

/**
 * Saves the currently rendered document sheet as a PDF or DOCX download.
 */
export async function saveRenderedDocumentAs(
    format: ExportFormat,
    title: string,
    sheetEl: HTMLElement,
) {
    const pages = await captureRenderedDocumentPages(sheetEl);

    if (format === 'pdf') {
        await exportPdf(pages, title);
        return;
    }

    await exportDocx(pages, title);
}
