'use client';

/**
 * Captures the isolated tiptap-pagination-plus print-preview surface as A4 PDF pages.
 *
 * This adapter only reads an already-rendered, read-only preview DOM. It does
 * not mutate document JSON, execute embedded markup, or fetch storage objects
 * outside the browser's normal image loading path.
 */
import {
    A4_PAPER_HEIGHT_PX,
    A4_PAPER_WIDTH_PX,
} from '@/constants/document-paper';
import { saveCanvasPagesAsPdf } from './export-document';
import {
    createPaginatedPageStartOffsets,
    getPaginatedSnapshotPageHeightPixels,
} from './export-paginated-preview-geometry';

const PAGINATED_EXPORT_ROOT_SELECTOR = '[data-paginated-print-export-root="true"]';
const EXECUTABLE_EXPORT_SELECTOR = [
    'script',
    'iframe',
    'object',
    'embed',
    'link[rel="import"]',
    'form',
    'input',
    'button',
    'textarea',
    'select',
].join(',');

function getPaginatedExportRoot(sourceEl: HTMLElement) {
    if (sourceEl.matches(PAGINATED_EXPORT_ROOT_SELECTOR)) return sourceEl;

    const rootEl = sourceEl.querySelector(PAGINATED_EXPORT_ROOT_SELECTOR);
    if (rootEl instanceof HTMLElement) return rootEl;

    throw new Error('Could not find the paginated preview export root.');
}

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

function sanitizeClonedPreview(rootEl: HTMLElement) {
    rootEl.querySelectorAll(EXECUTABLE_EXPORT_SELECTOR).forEach((element) => element.remove());

    rootEl.querySelectorAll<HTMLElement>('*').forEach((element) => {
        Array.from(element.attributes).forEach((attribute) => {
            if (attribute.name.toLowerCase().startsWith('on')) {
                element.removeAttribute(attribute.name);
            }
        });
    });
}

function createPaginatedExportClone(sourceRootEl: HTMLElement) {
    const hostEl = document.createElement('div');
    const rootEl = sourceRootEl.cloneNode(true) as HTMLElement;

    hostEl.setAttribute('data-paginated-export-host', 'true');
    hostEl.style.position = 'fixed';
    hostEl.style.left = '0';
    hostEl.style.top = '0';
    hostEl.style.width = `${A4_PAPER_WIDTH_PX}px`;
    hostEl.style.pointerEvents = 'none';
    hostEl.style.zIndex = '-1';
    hostEl.style.opacity = '1';

    rootEl.style.width = `${A4_PAPER_WIDTH_PX}px`;
    rootEl.style.opacity = '1';
    rootEl.style.transform = 'none';
    rootEl.style.transformOrigin = 'top left';
    rootEl.style.background = '#ffffff';
    sanitizeClonedPreview(rootEl);
    hostEl.appendChild(rootEl);
    document.body.appendChild(hostEl);

    return {
        rootEl,
        cleanup: () => hostEl.remove(),
    };
}

function getPaginationMeasurementTarget(rootEl: HTMLElement) {
    const editorEl = rootEl.querySelector('.rm-with-pagination');
    if (editorEl instanceof HTMLElement) return editorEl;

    const prosemirrorEl = rootEl.querySelector('.ProseMirror');
    if (prosemirrorEl instanceof HTMLElement) return prosemirrorEl;

    throw new Error('Could not find the paginated preview content to export.');
}

function getCaptureTarget(rootEl: HTMLElement) {
    const frameEl = rootEl.querySelector('.paginated-print-preview__frame');
    if (frameEl instanceof HTMLElement) return frameEl;

    return getPaginationMeasurementTarget(rootEl);
}

function getVisiblePageGaps(targetEl: HTMLElement) {
    return Array.from(targetEl.querySelectorAll('.rm-pagination-gap'))
        .filter((gapEl): gapEl is HTMLElement => (
            gapEl instanceof HTMLElement &&
            window.getComputedStyle(gapEl).display !== 'none' &&
            gapEl.offsetHeight > 0
        ));
}

function getPageStartOffsets(targetEl: HTMLElement) {
    const visibleGaps = getVisiblePageGaps(targetEl);
    const gapEndOffsets = visibleGaps.map((gapEl) => (
            Math.round(gapEl.offsetTop + gapEl.offsetHeight)
        ));

    return createPaginatedPageStartOffsets({
        scrollHeight: targetEl.scrollHeight,
        gapEndOffsets,
    });
}

async function renderPaginatedPreviewSnapshot(targetEl: HTMLElement) {
    const { default: html2canvas } = await import('html2canvas');
    const cssWidth = A4_PAPER_WIDTH_PX;
    const cssHeight = Math.max(targetEl.scrollHeight, A4_PAPER_HEIGHT_PX);
    const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);

    return html2canvas(targetEl, {
        backgroundColor: '#ffffff',
        scale,
        useCORS: true,
        logging: false,
        width: cssWidth,
        height: cssHeight,
        windowWidth: Math.max(window.innerWidth, cssWidth),
        windowHeight: Math.max(window.innerHeight, cssHeight),
        onclone: (clonedDocument) => {
            const clonedRoot = clonedDocument.querySelector(
                PAGINATED_EXPORT_ROOT_SELECTOR,
            ) as HTMLElement | null;

            if (!clonedRoot) return;
            sanitizeClonedPreview(clonedRoot);
            clonedRoot.querySelectorAll<HTMLElement>('.rm-pagination-gap').forEach((gapEl) => {
                gapEl.style.background = '#ffffff';
                gapEl.style.borderColor = '#ffffff';
            });
            clonedRoot.querySelectorAll<HTMLElement>('.ProseMirror, .rm-with-pagination').forEach((element) => {
                element.style.boxShadow = 'none';
                element.style.background = '#ffffff';
            });
        },
    });
}

function slicePaginatedSnapshotIntoPages(
    snapshotCanvas: HTMLCanvasElement,
    pageStartOffsets: number[],
    cssSnapshotHeight: number,
) {
    const pixelsPerCssPixel = snapshotCanvas.height / cssSnapshotHeight;
    const pageHeightPixels = getPaginatedSnapshotPageHeightPixels({
        snapshotHeight: snapshotCanvas.height,
        cssSnapshotHeight,
    });

    return pageStartOffsets.map((pageStartOffset) => {
        const pageCanvas = document.createElement('canvas');
        const sourceY = Math.round(pageStartOffset * pixelsPerCssPixel);
        const sourceHeight = Math.min(pageHeightPixels, snapshotCanvas.height - sourceY);

        pageCanvas.width = snapshotCanvas.width;
        pageCanvas.height = pageHeightPixels;
        const context = pageCanvas.getContext('2d');
        if (!context) throw new Error('Failed to prepare paginated PDF canvas.');

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
 * Saves the rendered paginated print-preview root as a PDF matching the preview pagination.
 */
export async function savePaginatedPreviewAsPdf(sourceEl: HTMLElement, title: string) {
    const sourceRootEl = getPaginatedExportRoot(sourceEl);
    const exportClone = createPaginatedExportClone(sourceRootEl);

    try {
        await waitForRenderableAssets(exportClone.rootEl);
        const measurementTargetEl = getPaginationMeasurementTarget(exportClone.rootEl);
        const captureTargetEl = getCaptureTarget(exportClone.rootEl);
        const pageStartOffsets = getPageStartOffsets(measurementTargetEl);

        if (pageStartOffsets.length === 0) {
            throw new Error('The paginated preview did not render any exportable pages.');
        }

        const snapshotCanvas = await renderPaginatedPreviewSnapshot(captureTargetEl);
        const pages = slicePaginatedSnapshotIntoPages(
            snapshotCanvas,
            pageStartOffsets,
            Math.max(captureTargetEl.scrollHeight, A4_PAPER_HEIGHT_PX),
        );

        await saveCanvasPagesAsPdf(pages, title);
    } finally {
        exportClone.cleanup();
    }
}
