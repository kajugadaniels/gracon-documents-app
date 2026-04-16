/**
 * Captures rendered document paper into A4-sized page canvases.
 *
 * Export uses a cloned paper sheet so responsive editor state never changes
 * the generated PDF/DOCX geometry.
 */
'use client';

import {
    A4_PAPER_ASPECT_RATIO,
    A4_PAPER_HEIGHT_PX,
    A4_PAPER_WIDTH_PX,
} from '@/constants/document-paper';
import { DEFAULT_DOCUMENT_LAYOUT, readDocumentLayoutFromElement } from '@/lib/document-layout';
import { createPaperExportGeometry } from '@/lib/document-layout-export-parity';

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

function applyExportPaperGeometry(
    sheetEl: HTMLElement,
    margins = DEFAULT_DOCUMENT_LAYOUT.margins,
) {
    const geometry = createPaperExportGeometry({
        paperSize: 'A4',
        margins,
    });

    Object.entries(geometry.cssVars).forEach(([property, value]) => {
        sheetEl.style.setProperty(property, value);
    });
    sheetEl.style.setProperty('--paper-width', `${A4_PAPER_WIDTH_PX}px`);
    sheetEl.style.setProperty('--paper-height', `${A4_PAPER_HEIGHT_PX}px`);

    sheetEl.style.width = `${A4_PAPER_WIDTH_PX}px`;
    sheetEl.style.maxWidth = `${A4_PAPER_WIDTH_PX}px`;
    sheetEl.style.minHeight = `${A4_PAPER_HEIGHT_PX}px`;
    sheetEl.style.margin = '0';
    sheetEl.style.boxShadow = 'none';
    sheetEl.style.background = '#ffffff';
    sheetEl.style.overflow = 'visible';
}

function removeExportOnlyUi(rootEl: HTMLElement) {
    rootEl.querySelectorAll('.document-page-guides').forEach((element) => {
        element.remove();
    });
}

function createExportSheet(sourceSheetEl: HTMLElement) {
    const hostEl = document.createElement('div');
    const sourceWrapperEl = sourceSheetEl.closest('.tiptap-editor-paper');
    const sourceLayoutEl = sourceWrapperEl instanceof HTMLElement
        ? sourceWrapperEl
        : sourceSheetEl;
    const sourceLayout = readDocumentLayoutFromElement(sourceLayoutEl);
    const exportRootEl = sourceWrapperEl instanceof HTMLElement
        ? sourceWrapperEl.cloneNode(true) as HTMLElement
        : sourceSheetEl.cloneNode(true) as HTMLElement;
    const sheetEl = exportRootEl.matches('.document-paper-sheet')
        ? exportRootEl
        : exportRootEl.querySelector('.document-paper-sheet');

    if (!(sheetEl instanceof HTMLElement)) {
        throw new Error('Could not prepare the rendered document for export.');
    }

    hostEl.setAttribute('data-document-export-host', 'true');
    hostEl.style.position = 'fixed';
    hostEl.style.left = '0';
    hostEl.style.top = '0';
    hostEl.style.width = `${A4_PAPER_WIDTH_PX}px`;
    hostEl.style.pointerEvents = 'none';
    hostEl.style.zIndex = '-1';

    removeExportOnlyUi(exportRootEl);
    applyExportPaperGeometry(sheetEl, sourceLayout.margins);
    hostEl.appendChild(exportRootEl);
    document.body.appendChild(hostEl);

    return {
        sheetEl,
        sourceLayout,
        cleanup: () => hostEl.remove(),
    };
}

async function renderExportSheet(
    sheetEl: HTMLElement,
    margins = DEFAULT_DOCUMENT_LAYOUT.margins,
) {
    await waitForRenderableAssets(sheetEl);

    const { default: html2canvas } = await import('html2canvas');
    const cssWidth = A4_PAPER_WIDTH_PX;
    const cssHeight = Math.max(sheetEl.scrollHeight, sheetEl.offsetHeight, A4_PAPER_HEIGHT_PX);
    const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);

    return html2canvas(sheetEl, {
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

            removeExportOnlyUi(clonedSheet);
            applyExportPaperGeometry(clonedSheet, margins);
        },
    });
}

function sliceCanvasIntoA4Pages(snapshotCanvas: HTMLCanvasElement, cssHeight: number) {
    const cssPageHeight = Math.max(
        Math.round(A4_PAPER_WIDTH_PX * A4_PAPER_ASPECT_RATIO),
        1,
    );
    const pixelsPerCssPixel = snapshotCanvas.height / cssHeight;
    const pageHeightPixels = Math.max(Math.round(cssPageHeight * pixelsPerCssPixel), 1);
    const pageCount = Math.max(Math.ceil(snapshotCanvas.height / pageHeightPixels), 1);

    return Array.from({ length: pageCount }, (_, pageIndex) => {
        const pageCanvas = document.createElement('canvas');
        const sourceY = pageIndex * pageHeightPixels;
        const sourceHeight = Math.min(pageHeightPixels, snapshotCanvas.height - sourceY);

        pageCanvas.width = snapshotCanvas.width;
        pageCanvas.height = pageHeightPixels;
        const context = pageCanvas.getContext('2d');
        if (!context) throw new Error('Failed to prepare export canvas.');

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

        return pageCanvas;
    });
}

/**
 * Returns one canvas per A4 export page without mutating the live editor DOM.
 */
export async function captureRenderedDocumentPages(sheetEl: HTMLElement) {
    const exportSheet = createExportSheet(sheetEl);

    try {
        const snapshotCanvas = await renderExportSheet(
            exportSheet.sheetEl,
            exportSheet.sourceLayout.margins,
        );
        const cssHeight = Math.max(
            exportSheet.sheetEl.scrollHeight,
            exportSheet.sheetEl.offsetHeight,
            A4_PAPER_HEIGHT_PX,
        );

        return sliceCanvasIntoA4Pages(snapshotCanvas, cssHeight);
    } finally {
        exportSheet.cleanup();
    }
}
