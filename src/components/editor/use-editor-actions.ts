/**
 * use-editor-actions
 *
 * Custom hook that encapsulates all document-editor menu action state and
 * handling: file import, save-as, copy, print, and all editor commands
 * (edit, format, insert). Extracted from DocEditorHeader to keep the header
 * component focused on layout and wiring.
 */
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Editor } from '@tiptap/react';
import {
    createDocument, autosaveDocument, copyDocument,
    type DocumentDetail,
} from '@/api/documents.api';
import { toast } from '@/components/ui';
import { INSERT_ACTION_IDS } from '@/constants/insert-menu';
import { importDocxToTiptap } from '@/lib/import-docx';
import { saveRenderedDocumentAs } from '@/lib/export-document';

interface UseEditorActionsOptions {
    editor: Editor | null;
    doc: DocumentDetail;
    editingTitle: boolean;
    title: string;
    isReadOnly: boolean;
    onTitleEditStart: () => void;
    onTitleSave: () => void | Promise<void>;
    /** Called when the Edit → Find menu item is dispatched. */
    onFindToggle: () => void;
    /** Called when a View menu action is dispatched. */
    onViewAction?: (actionId: string) => void;
}

interface UseEditorActionsReturn {
    importing: boolean;
    copying: boolean;
    savingAs: 'pdf' | 'docx' | null;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    /** Pass to the hidden <input type="file"> onChange handler. */
    handleFileImport: (file: File) => Promise<void>;
    /** Dispatches a menu action ID to the appropriate handler or editor command. */
    handleAction: (actionId: string) => void;
}

/**
 * Encapsulates all editor menu action handling and the async state it drives.
 *
 * @param options - Editor instance, document details, and callback hooks.
 * @returns Action state flags, the hidden file input ref, and the action dispatcher.
 */
export function useEditorActions({
    editor, doc, editingTitle, title, isReadOnly,
    onTitleEditStart, onTitleSave, onFindToggle, onViewAction,
}: UseEditorActionsOptions): UseEditorActionsReturn {
    const router = useRouter();
    const [importing, setImporting] = useState(false);
    const [copying,   setCopying]   = useState(false);
    const [savingAs,  setSavingAs]  = useState<'pdf' | 'docx' | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /** Converts an uploaded .docx file to TipTap JSON, saves it as a new document. */
    const handleFileImport = useCallback(async (file: File) => {
        setImporting(true);
        const toastId = toast.loading('Importing document…');
        try {
            const { content, title: suggestedTitle } = await importDocxToTiptap(file);
            const imported = await createDocument({ type: 'RICH_TEXT', title: suggestedTitle });
            await autosaveDocument(imported.id, content);
            toast.dismiss(toastId);
            toast.success(`"${suggestedTitle}" imported`);
            router.push('/documents');
        } catch (err: unknown) {
            toast.dismiss(toastId);
            toast.error(err instanceof Error ? err.message : 'Failed to import document.');
        } finally {
            setImporting(false);
            // Reset so the same file can be re-selected if needed.
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [router]);

    const handleAction = useCallback((actionId: string) => {
        if (actionId.startsWith('view:')) {
            if (editingTitle) {
                void Promise.resolve(onTitleSave());
            }
            onViewAction?.(actionId);
            return;
        }

        // ── File: New ──────────────────────────────────────────────────────────
        if (actionId === 'file:new') {
            // Open a placeholder tab synchronously so popup blockers do not fire.
            const loadingUrl = new URL('/documents', window.location.origin).toString();
            const newTab = window.open(loadingUrl, '_blank');
            createDocument({ type: 'RICH_TEXT' })
                .then((created) => {
                    if (newTab) {
                        newTab.location.replace(
                            new URL(`/documents/${created.id}/edit`, window.location.origin).toString(),
                        );
                    } else {
                        toast.error('Popup blocked. Please allow popups and try again.');
                    }
                })
                .catch(() => { newTab?.close(); toast.error('Failed to create document.'); });
            return;
        }

        // ── File: Open ─────────────────────────────────────────────────────────
        if (actionId === 'file:open') {
            if (!importing) fileInputRef.current?.click();
            return;
        }

        // ── File: Rename ───────────────────────────────────────────────────────
        if (actionId === 'file:rename') {
            if (isReadOnly) { toast.warning('This document cannot be renamed right now.'); return; }
            onTitleEditStart();
            return;
        }

        // ── File: Make a copy ──────────────────────────────────────────────────
        if (actionId === 'file:copy') {
            if (copying) return;
            setCopying(true);
            Promise.resolve()
                .then(async () => {
                    if (editingTitle) await Promise.resolve(onTitleSave());
                    if (doc.status === 'DRAFT' && editor) {
                        const content = editor.getJSON() as Record<string, unknown>;
                        const words =
                            (editor.storage.characterCount?.words?.() as number | undefined)
                            ?? doc.wordCount;
                        await autosaveDocument(doc.id, content, words);
                    }
                    const copied = await copyDocument(doc.id);
                    toast.success(`Created "${copied.title}"`);
                    router.push(`/documents/${copied.id}/edit`);
                })
                .catch((error: unknown) => {
                    const msg = (error as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message;
                    toast.error(typeof msg === 'string' && msg.trim() ? msg : 'Failed to make a copy.');
                })
                .finally(() => setCopying(false));
            return;
        }

        // ── File: Save as PDF / DOCX ───────────────────────────────────────────
        if (actionId === 'file:save-as-pdf' || actionId === 'file:save-as-docx') {
            if (savingAs) return;
            const format = actionId === 'file:save-as-pdf' ? 'pdf' : 'docx';
            setSavingAs(format);
            Promise.resolve()
                .then(async () => {
                    if (editingTitle) await Promise.resolve(onTitleSave());
                    const sheetEl = document.querySelector('.document-paper-sheet') as HTMLElement | null;
                    if (!sheetEl) throw new Error('Could not find the rendered document to export.');
                    await saveRenderedDocumentAs(format, title.trim() || doc.title, sheetEl);
                    toast.success(`Saved as ${format.toUpperCase()}`);
                })
                .catch((error: unknown) => {
                    toast.error(
                        error instanceof Error
                            ? error.message
                            : `Failed to save as ${format.toUpperCase()}.`,
                    );
                })
                .finally(() => setSavingAs(null));
            return;
        }

        // ── Edit: Find ─────────────────────────────────────────────────────────
        if (actionId === 'edit:find') {
            onFindToggle();
            return;
        }

        if (!editor) return;

        // ── All editor commands ────────────────────────────────────────────────
        const chain = editor.chain().focus();
        switch (actionId) {
            case 'file:print':       window.print(); break;
            case 'edit:undo':        chain.undo().run(); break;
            case 'edit:redo':        chain.redo().run(); break;
            case 'edit:cut':         editor.view.focus(); document.execCommand('cut'); break;
            case 'edit:copy':        editor.view.focus(); document.execCommand('copy'); break;
            case 'edit:paste':
                navigator.clipboard.readText()
                    .then((text) => { if (text) editor.chain().focus().insertContent(text).run(); })
                    .catch(() => toast.warning('Paste using ⌘V / Ctrl+V'));
                break;
            case 'edit:select-all':  chain.selectAll().run(); break;
            case 'format:bold':      chain.toggleBold().run(); break;
            case 'format:italic':    chain.toggleItalic().run(); break;
            case 'format:underline': chain.toggleUnderline().run(); break;
            case 'format:strike':    chain.toggleStrike().run(); break;
            case 'format:highlight': chain.toggleHighlight().run(); break;
            case 'format:clear':     chain.clearNodes().unsetAllMarks().run(); break;
            case INSERT_ACTION_IDS.table:
                chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                break;
            case INSERT_ACTION_IDS.horizontalRule:
                chain.setHorizontalRule().run();
                break;
        }
    }, [
        copying, doc.id, doc.status, doc.title, doc.wordCount,
        editingTitle, editor, importing, isReadOnly,
        onFindToggle, onTitleEditStart, onTitleSave, onViewAction,
        router, savingAs, title,
    ]);

    return { importing, copying, savingAs, fileInputRef, handleFileImport, handleAction };
}
