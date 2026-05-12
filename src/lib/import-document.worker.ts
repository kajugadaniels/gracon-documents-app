/**
 * Browser worker entrypoint for converting expensive document imports.
 */
import { importFileToTiptap } from './import-docx';

interface ImportWorkerRequest {
    file: File;
}

type ImportWorkerResponse =
    | { kind: 'progress'; phase: 'starting' | 'converting' }
    | { kind: 'success'; result: Awaited<ReturnType<typeof importFileToTiptap>> }
    | { kind: 'error'; message: string; recoverable: boolean };

interface ImportWorkerScope {
    onmessage: ((event: MessageEvent<ImportWorkerRequest>) => void) | null;
    postMessage: (message: ImportWorkerResponse) => void;
}

const ctx = self as unknown as ImportWorkerScope;

function postMessage(message: ImportWorkerResponse) {
    ctx.postMessage(message);
}

ctx.onmessage = (event: MessageEvent<ImportWorkerRequest>) => {
    const { file } = event.data;

    void (async () => {
        try {
            postMessage({ kind: 'progress', phase: 'starting' });

            if (typeof DOMParser === 'undefined') {
                postMessage({
                    kind: 'error',
                    message: 'Background DOCX parsing is not supported in this browser.',
                    recoverable: true,
                });
                return;
            }

            postMessage({ kind: 'progress', phase: 'converting' });
            postMessage({ kind: 'success', result: await importFileToTiptap(file) });
        } catch (error) {
            postMessage({
                kind: 'error',
                message: error instanceof Error ? error.message : 'Document import failed.',
                recoverable: true,
            });
        }
    })();
};
