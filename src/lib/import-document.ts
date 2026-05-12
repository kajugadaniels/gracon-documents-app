import { importDocxToTiptap, type ImportResult } from './import-docx';
import { importPdfToTiptap } from './import-pdf';

export const DOCUMENT_IMPORT_ACCEPT = '.docx,.doc,.pdf,application/pdf';

export async function importDocumentToTiptap(file: File): Promise<ImportResult> {
    if (file.name.match(/\.pdf$/i) || file.type === 'application/pdf') {
        return importPdfToTiptap(file);
    }

    return importDocxToTiptap(file);
}
