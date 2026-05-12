/**
 * Coordinates responsive document import jobs for the editor UI.
 */
import type { ImportResult } from './import-docx';

export type ImportJobPhase = 'queued' | 'background' | 'main-thread' | 'saving';

interface ImportDocumentJobOptions {
    onProgress?: (phase: ImportJobPhase) => void;
}

type ImportWorkerResponse =
    | { kind: 'progress'; phase: 'starting' | 'converting' }
    | { kind: 'success'; result: ImportResult }
    | { kind: 'error'; message: string; recoverable: boolean };

export function isDocxImportFile(file: Pick<File, 'name'>) {
    return /\.docx$/i.test(file.name);
}

export function canUseImportWorker(file: Pick<File, 'name'>) {
    return typeof window !== 'undefined' && typeof Worker !== 'undefined' && isDocxImportFile(file);
}

function yieldToBrowser() {
    return new Promise<void>((resolve) => {
        globalThis.setTimeout(resolve, 0);
    });
}

function importWithWorker(file: File, onProgress?: (phase: ImportJobPhase) => void) {
    return new Promise<ImportResult>((resolve, reject) => {
        const worker = new Worker(new URL('./import-document.worker.ts', import.meta.url), {
            type: 'module',
        });

        worker.onmessage = (event: MessageEvent<ImportWorkerResponse>) => {
            const message = event.data;

            if (message.kind === 'progress') {
                onProgress?.('background');
                return;
            }

            worker.terminate();

            if (message.kind === 'success') {
                resolve(message.result);
                return;
            }

            reject(new Error(message.message));
        };

        worker.onerror = () => {
            worker.terminate();
            reject(new Error('Background import failed.'));
        };

        worker.postMessage({ file });
    });
}

/**
 * Imports a document while giving the browser a paint opportunity before heavy fallback work.
 *
 * @param file - The selected document file.
 * @param options - Optional progress callback for UI status updates.
 * @returns Converted TipTap content and suggested document title.
 */
export async function importDocumentWithJob(
    file: File,
    options: ImportDocumentJobOptions = {},
) {
    options.onProgress?.('queued');

    if (canUseImportWorker(file)) {
        try {
            return await importWithWorker(file, options.onProgress);
        } catch {
            // Worker support varies by browser and file shape; the main-thread path is authoritative.
        }
    }

    options.onProgress?.('main-thread');
    await yieldToBrowser();
    const { importFileToTiptap } = await import('./import-docx');
    return importFileToTiptap(file);
}
