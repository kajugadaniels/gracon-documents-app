/**
 * Captures the paged document frame into A4-sized page canvases.
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

async function waitForRenderableAssets(rootEl: HTMLElement) {
    if ('fonts' in document) {
        await document.fonts.ready;
    }

    const images = Array.from(rootEl.querySelectorAll('img'));
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
    rootEl: HTMLElement,
    margins = DEFAULT_DOCUMENT_LAYOUT.margins,
) {
    const geometry = createPaperExportGeometry({
        paperSize: 'A4',
        margins,
    });

    Object.entries(geometry.cssVars).forEach(([property, value]) => {
        rootEl.style.setProperty(property, value);
    });
    rootEl.style.setProperty('--paper-width', `${A4_PAPER_WIDTH_PX}px`);
    rootEl.style.setProperty('--paper-height', `${A4_PAPER_HEIGHT_PX}px`);
}

function removeExportOnlyUi(rootEl: HTMLElement) {
    rootEl.querySelectorAll('.document-page-guides').forEach((element) => {
        element.remove();
    });
}

function getExportFrame(sourceEl: HTMLElement) {
    if (sourceEl.matches('[data-document-export-root="true"]')) return sourceEl;

    const frame = sourceEl.closest('[data-document-export-root="true"]');
    if (frame instanceof HTMLElement) return frame;

    throw new Error('Could not find the paged document frame to export.');
}

function getLayoutSourceElement(frameEl: HTMLElement) {
    return frameEl.querySelector('.tiptap-editor-paper') instanceof HTMLElement
        ? frameEl.querySelector('.tiptap-editor-paper') as HTMLElement
        : frameEl;
}

function getPageCount(frameEl: HTMLElement) {
    const parsed = Number.parseInt(frameEl.dataset.documentPageCount ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function createPageSurface(frameEl: HTMLElement, pageNumber: number, pageCount: number) {
    const pageEl = document.createElement('section');
    const headerEl = document.createElement('header');
    const footerEl = document.createElement('footer');
    const headerEnabled = frameEl.dataset.documentHeaderEnabled !== 'false';
    const footerEnabled = frameEl.dataset.documentFooterEnabled !== 'false';
    const pageNumbersEnabled = frameEl.dataset.documentPageNumbersEnabled !== 'false';

    pageEl.className = 'document-page-surface';
    pageEl.style.top = `${(pageNumber - 1) * A4_PAPER_HEIGHT_PX}px`;
    pageEl.style.height = `${A4_PAPER_HEIGHT_PX}px`;
    headerEl.className = `document-page-surface__header${headerEnabled ? '' : ' document-page-surface__chrome--hidden'}`;
    footerEl.className = `document-page-surface__footer${footerEnabled ? '' : ' document-page-surface__chrome--hidden'}`;
    headerEl.innerHTML = `<span class="document-page-surface__title"></span>${pageNumbersEnabled ? '<span class="document-page-surface__tag"></span>' : ''}`;
    footerEl.innerHTML = `<span></span>${pageNumbersEnabled ? '<span></span>' : ''}`;
    headerEl.children[0].textContent = frameEl.dataset.documentHeaderText ?? frameEl.dataset.documentTitle ?? '';
    if (pageNumbersEnabled && headerEl.children[1]) headerEl.children[1].textContent = `Page ${pageNumber}`;
    footerEl.children[0].textContent = frameEl.dataset.documentFooterText ?? `${frameEl.dataset.documentStatus ?? 'draft'} document`;
    if (pageNumbersEnabled && footerEl.children[1]) footerEl.children[1].textContent = `Page ${pageNumber} of ${pageCount}`;
    pageEl.append(headerEl, footerEl);

    return pageEl;
}

function ensurePageSurfaces(frameEl: HTMLElement) {
    if (frameEl.querySelector('.document-page-surfaces')) return;

    const surfacesEl = document.createElement('div');
    const pageCount = getPageCount(frameEl);
    surfacesEl.className = 'document-page-surfaces';
    Array.from({ length: pageCount }, (_, index) => {
        surfacesEl.appendChild(createPageSurface(frameEl, index + 1, pageCount));
        return null;
    });
    frameEl.prepend(surfacesEl);
}

function prepareExportFrame(frameEl: HTMLElement, pageCount: number) {
    frameEl.classList.remove('document-layout-frame--web-layout', 'document-layout-frame--show-marks');
    frameEl.classList.add('document-layout-frame--paged');
    frameEl.style.width = `${A4_PAPER_WIDTH_PX}px`;
    frameEl.style.minHeight = `${A4_PAPER_HEIGHT_PX * pageCount}px`;
    frameEl.style.transform = 'none';
    frameEl.style.transformOrigin = 'top left';
    frameEl.querySelectorAll<HTMLElement>('.document-page-surface').forEach((pageEl) => {
        pageEl.style.boxShadow = 'none';
    });
}

function createExportSheet(sourceEl: HTMLElement) {
    const hostEl = document.createElement('div');
    const sourceFrameEl = getExportFrame(sourceEl);
    const sourceLayout = readDocumentLayoutFromElement(getLayoutSourceElement(sourceFrameEl));
    const frameEl = sourceFrameEl.cloneNode(true) as HTMLElement;
    const sheetEl = frameEl.querySelector('.document-paper-sheet');
    const pageCount = getPageCount(sourceFrameEl);

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

    removeExportOnlyUi(frameEl);
    applyExportPaperGeometry(frameEl, sourceLayout.margins);
    applyExportPaperGeometry(sheetEl, sourceLayout.margins);
    ensurePageSurfaces(frameEl);
    prepareExportFrame(frameEl, pageCount);
    hostEl.appendChild(frameEl);
    document.body.appendChild(hostEl);

    return {
        frameEl,
        sourceLayout,
        pageCount,
        cleanup: () => hostEl.remove(),
    };
}

async function renderExportSheet(
    frameEl: HTMLElement,
    margins = DEFAULT_DOCUMENT_LAYOUT.margins,
    pageCount = 1,
) {
    await waitForRenderableAssets(frameEl);

    const { default: html2canvas } = await import('html2canvas');
    const cssWidth = A4_PAPER_WIDTH_PX;
    const cssHeight = A4_PAPER_HEIGHT_PX * pageCount;
    const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);

    return html2canvas(frameEl, {
        backgroundColor: '#ffffff',
        scale,
        useCORS: true,
        logging: false,
        width: cssWidth,
        height: cssHeight,
        windowWidth: Math.max(window.innerWidth, cssWidth),
        windowHeight: Math.max(window.innerHeight, cssHeight),
        onclone: (clonedDocument) => {
            const clonedFrame = clonedDocument.querySelector('[data-document-export-root="true"]') as HTMLElement | null;
            if (!clonedFrame) return;

            removeExportOnlyUi(clonedFrame);
            applyExportPaperGeometry(clonedFrame, margins);
            prepareExportFrame(clonedFrame, pageCount);
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
export async function captureRenderedDocumentPages(sourceEl: HTMLElement) {
    const exportSheet = createExportSheet(sourceEl);

    try {
        const snapshotCanvas = await renderExportSheet(
            exportSheet.frameEl,
            exportSheet.sourceLayout.margins,
            exportSheet.pageCount,
        );
        const cssHeight = A4_PAPER_HEIGHT_PX * exportSheet.pageCount;

        return sliceCanvasIntoA4Pages(snapshotCanvas, cssHeight);
    } finally {
        exportSheet.cleanup();
    }
}
