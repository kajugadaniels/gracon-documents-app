'use client';

import {
    A4_PAPER_ASPECT_RATIO,
    A4_PAPER_HEIGHT_PT,
    A4_PAPER_HEIGHT_PX,
    A4_PAPER_HEIGHT_TWIP,
    A4_PAPER_WIDTH_PT,
    A4_PAPER_WIDTH_PX,
    A4_PAPER_WIDTH_TWIP,
} from '@/constants/document-paper';

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

async function waitForRenderableAssets(sheetEl: HTMLElement) {
    if ('fonts' in document) {
        await document.fonts.ready;
    }

    const images = Array.from(sheetEl.querySelectorAll('img'));

    await Promise.all(images.map((image) => new Promise<void>((resolve) => {
        if (image.complete) {
            resolve();
            return;
        }

        const finish = () => resolve();
        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
    })));
}

async function captureDocumentPages(sheetEl: HTMLElement) {
    await waitForRenderableAssets(sheetEl);

    const { default: html2canvas } = await import('html2canvas');
    const rect = sheetEl.getBoundingClientRect();
    const cssWidth = Math.max(Math.round(rect.width), 1);
    const cssHeight = Math.max(sheetEl.scrollHeight, Math.round(rect.height), 1);
    const cssPageHeight = Math.max(Math.round(cssWidth * A4_PAPER_ASPECT_RATIO), 1);
    const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);

    const snapshotCanvas = await html2canvas(sheetEl, {
        backgroundColor: '#ffffff',
        scale,
        useCORS: true,
        logging: false,
        width: cssWidth,
        height: cssHeight,
        windowWidth: Math.max(window.innerWidth, cssWidth),
        windowHeight: Math.max(window.innerHeight, cssHeight),
        onclone: (clonedDocument) => {
            const clonedSheet = clonedDocument.querySelector('.document-paper-sheet') as HTMLElement | null;
            if (!clonedSheet) return;

            clonedSheet.style.boxShadow = 'none';
            clonedSheet.style.margin = '0';
            clonedSheet.style.background = '#ffffff';
        },
    });

    const pixelsPerCssPixel = snapshotCanvas.height / cssHeight;
    const pageHeightPixels = Math.max(Math.round(cssPageHeight * pixelsPerCssPixel), 1);
    const pageCount = Math.max(Math.ceil(snapshotCanvas.height / pageHeightPixels), 1);

    const pages: HTMLCanvasElement[] = [];

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        const sourceY = pageIndex * pageHeightPixels;
        const sourceHeight = Math.min(pageHeightPixels, snapshotCanvas.height - sourceY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = snapshotCanvas.width;
        pageCanvas.height = pageHeightPixels;

        const context = pageCanvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to prepare export canvas.');
        }

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(
            snapshotCanvas,
            0,
            sourceY,
            snapshotCanvas.width,
            sourceHeight,
            0,
            0,
            pageCanvas.width,
            sourceHeight,
        );

        pages.push(pageCanvas);
    }

    return pages;
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

export async function saveRenderedDocumentAs(
    format: ExportFormat,
    title: string,
    sheetEl: HTMLElement,
) {
    const pages = await captureDocumentPages(sheetEl);

    if (format === 'pdf') {
        await exportPdf(pages, title);
        return;
    }

    await exportDocx(pages, title);
}
