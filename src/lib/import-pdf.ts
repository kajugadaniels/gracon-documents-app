import {
    convertPdfPagesToTiptapContent,
    type PdfTextSourceItem,
    type PdfTextSourcePage,
} from './import-pdf-layout';

export interface ImportPdfResult {
    content: Record<string, unknown>;
    title: string;
}

function getPdfTitle(fileName: string) {
    return fileName
        .replace(/\.pdf$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim() || 'Imported PDF';
}

function isTextItem(item: unknown): item is PdfTextSourceItem {
    return typeof item === 'object'
        && item !== null
        && 'str' in item
        && typeof (item as { str?: unknown }).str === 'string'
        && 'transform' in item
        && Array.isArray((item as { transform?: unknown }).transform);
}

export async function importPdfToTiptap(file: File): Promise<ImportPdfResult> {
    if (!file.name.match(/\.pdf$/i) && file.type !== 'application/pdf') {
        throw new Error('Only PDF files are supported.');
    }

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc ||= new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url,
    ).toString();
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({
        data,
        useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;

    try {
        const pages: PdfTextSourcePage[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1 });
            const textContent = await page.getTextContent({
                includeMarkedContent: false,
                disableNormalization: false,
            });
            const items: PdfTextSourceItem[] = [];

            textContent.items.forEach((item) => {
                if (!isTextItem(item)) return;
                items.push({
                    str: item.str,
                    transform: item.transform,
                    width: item.width,
                    height: item.height,
                    fontName: item.fontName,
                    hasEOL: item.hasEOL,
                });
            });

            pages.push({
                width: viewport.width,
                height: viewport.height,
                items,
                styles: textContent.styles,
            });
        }

        const hasText = pages.some((page) => page.items.some((item) => item.str.trim()));

        if (!hasText) {
            throw new Error('The PDF appears to be empty or contains only scanned images.');
        }

        const content = convertPdfPagesToTiptapContent(pages);

        return {
            content,
            title: getPdfTitle(file.name),
        };
    } finally {
        await pdf.destroy();
    }
}
