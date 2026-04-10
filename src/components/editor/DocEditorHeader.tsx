/**
 * DocEditorHeader
 *
 * Google Docs-style two-row sticky editor header.
 * Row 1 (menu bar): logo/back, document title, menu strip (File … Help), right actions.
 * Row 2 (toolbar):  formatting toolbar via DocEditorToolbar.
 *
 * Active editor commands are wired; all other menu items are shown but non-destructive.
 */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Editor } from '@tiptap/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    ArrowLeft01Icon, StarIcon, FolderOpenIcon,
    Share01Icon, Comment01Icon, Clock01Icon, Logout01Icon,
} from '@hugeicons/core-free-icons';
import { useSessionUser } from '@/app/(protected)/layout';
import { APP_URL } from '@/lib/session';
import {
    createDocument,
    autosaveDocument,
    copyDocument,
    type DocumentDetail,
} from '@/api/documents.api';
import { toast } from '@/components/ui';
import { importDocxToTiptap } from '@/lib/import-docx';
import type { MenuItem } from '@/constants';
import {
    FILE_MENU_ITEMS, EDIT_MENU_ITEMS, VIEW_MENU_ITEMS, INSERT_MENU_ITEMS,
    FORMAT_MENU_ITEMS, TOOLS_MENU_ITEMS, EXTENSIONS_MENU_ITEMS, HELP_MENU_ITEMS,
} from '@/constants';
import { DocEditorToolbar } from './DocEditorToolbar';

const MENU_BAR = [
    { label: 'File',       items: FILE_MENU_ITEMS },
    { label: 'Edit',       items: EDIT_MENU_ITEMS },
    { label: 'View',       items: VIEW_MENU_ITEMS },
    { label: 'Insert',     items: INSERT_MENU_ITEMS },
    { label: 'Format',     items: FORMAT_MENU_ITEMS },
    { label: 'Tools',      items: TOOLS_MENU_ITEMS },
    { label: 'Extensions', items: EXTENSIONS_MENU_ITEMS },
    { label: 'Help',       items: HELP_MENU_ITEMS },
] as const;

// ─── Menu dropdown ────────────────────────────────────────────────────────────

function MenuDropdown({
    label, items, onAction,
}: {
    label: string;
    items: readonly MenuItem[];
    onAction: (actionId: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    return (
        <div ref={ref} className="ded-menu">
            <button className={`ded-menu__trigger${open ? ' ded-menu__trigger--open' : ''}`}
                onClick={() => setOpen(v => !v)}>
                {label}
            </button>
            {open && (
                <div className="ded-menu__dropdown">
                    {items.map((item, i) => item.type === 'divider'
                        ? <div key={i} className="ded-menu__divider" />
                        : (
                            <button
                                key={item.actionId}
                                disabled={item.disabled}
                                className="ded-menu__item"
                                onClick={() => { onAction(item.actionId); setOpen(false); }}
                            >
                                <span>{item.label}</span>
                                {item.shortcut && <span className="ded-menu__shortcut">{item.shortcut}</span>}
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    );
}

// ─── User avatar dropdown ─────────────────────────────────────────────────────

function UserAvatarMenu() {
    const user = useSessionUser();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    if (!user) return null;
    const initials = `${user.postNames?.[0] ?? ''}${user.surName?.[0] ?? ''}`.toUpperCase() || 'U';
    function logout() {
        document.cookie = 'g360_at=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'g360_rt=; path=/; max-age=0; SameSite=Lax';
        window.location.href = `${APP_URL}/logout`;
    }
    return (
        <div ref={ref} className="ded-avatar-menu">
            <button className="ded-avatar-btn" onClick={() => setOpen(v => !v)}
                title={`${user.postNames} ${user.surName}`} aria-label="Account menu">
                {user.imageUrl
                    ? <img src={user.imageUrl} alt={initials} width={32} height={32} style={{ borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                    : <span className="ded-avatar-btn__initials">{initials}</span>
                }
            </button>
            {open && (
                <div className="ded-avatar-menu__dropdown">
                    <div className="ded-avatar-menu__profile">
                        <p className="ded-avatar-menu__name">{user.postNames} {user.surName}</p>
                        <p className="ded-avatar-menu__email">{user.email}</p>
                    </div>
                    <div className="ded-avatar-menu__divider" />
                    <button className="ded-avatar-menu__item ded-avatar-menu__item--danger" onClick={logout}>
                        <HugeiconsIcon icon={Logout01Icon} size={15} />
                        <span>Sign out</span>
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Main header ──────────────────────────────────────────────────────────────

interface DocEditorHeaderProps {
    editor: Editor | null;
    doc: DocumentDetail;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    editingTitle: boolean;
    title: string;
    onTitleChange: (v: string) => void;
    onTitleSave: () => void | Promise<void>;
    onTitleEditStart: () => void;
    onTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    isReadOnly: boolean;
    isLocked: boolean;
    isFinalised: boolean;
    exportingPdf: boolean;
    onFinalise: () => void;
    onExportPdf: () => void;
    onViewSignature: () => void;
}

/** Full Google Docs-style two-row sticky header for the document editor. */
export function DocEditorHeader({
    editor, doc, saveStatus, editingTitle, title,
    onTitleChange, onTitleSave, onTitleEditStart, onTitleKeyDown,
    isReadOnly, isLocked, isFinalised, exportingPdf,
    onFinalise, onExportPdf, onViewSignature,
}: DocEditorHeaderProps) {
    const router = useRouter();
    const [importing, setImporting] = useState(false);
    const [copying, setCopying] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!editingTitle || !titleInputRef.current) return;
        titleInputRef.current.focus();
        titleInputRef.current.select();
    }, [editingTitle]);

    /**
     * Handles a .docx file selected via the hidden file input.
     * Converts the file to TipTap JSON, creates a new document, saves the
     * content, then returns the user to the documents list to open it there.
     */
    const handleFileImport = useCallback(async (file: File) => {
        setImporting(true);
        const importToastId = toast.loading('Importing document…');
        try {
            const { content, title: suggestedTitle } = await importDocxToTiptap(file);
            const importedDoc = await createDocument({ type: 'RICH_TEXT', title: suggestedTitle });
            await autosaveDocument(importedDoc.id, content);
            toast.dismiss(importToastId);
            toast.success(`"${suggestedTitle}" imported`);
            router.push('/documents');
        } catch (err: unknown) {
            toast.dismiss(importToastId);
            const message = err instanceof Error ? err.message : 'Failed to import document.';
            toast.error(message);
        } finally {
            setImporting(false);
            // Reset so the same file can be re-selected if needed.
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [router]);

    const handleAction = useCallback((actionId: string) => {
        // File actions that don't require the editor run first.
        if (actionId === 'file:new') {
            // Open a same-origin placeholder tab synchronously so popup
            // blockers do not interfere, then replace it with the new editor.
            const loadingUrl = new URL('/documents', window.location.origin).toString();
            const newTab = window.open(loadingUrl, '_blank');
            createDocument({ type: 'RICH_TEXT' })
                .then((doc) => {
                    if (newTab) {
                        newTab.location.replace(
                            new URL(`/documents/${doc.id}/edit`, window.location.origin).toString(),
                        );
                    } else {
                        toast.error('Popup blocked. Please allow popups and try again.');
                    }
                })
                .catch(() => {
                    newTab?.close();
                    toast.error('Failed to create document.');
                });
            return;
        }

        if (actionId === 'file:open') {
            if (!importing) fileInputRef.current?.click();
            return;
        }

        if (actionId === 'file:rename') {
            if (isReadOnly) {
                toast.warning('This document cannot be renamed right now.');
                return;
            }
            onTitleEditStart();
            return;
        }

        if (actionId === 'file:copy') {
            if (copying) return;

            setCopying(true);

            Promise.resolve()
                .then(async () => {
                    if (editingTitle) {
                        await Promise.resolve(onTitleSave());
                    }

                    if (doc.status === 'DRAFT' && editor) {
                        const latestContent = editor.getJSON() as Record<string, unknown>;
                        const latestWordCount =
                            (editor.storage.characterCount?.words?.() as number | undefined)
                            ?? doc.wordCount;

                        await autosaveDocument(doc.id, latestContent, latestWordCount);
                    }

                    const copied = await copyDocument(doc.id);
                    toast.success(`Created "${copied.title}"`);
                    router.push(`/documents/${copied.id}/edit`);
                })
                .catch((error: unknown) => {
                    const message = (error as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message;
                    toast.error(
                        typeof message === 'string' && message.trim()
                            ? message
                            : 'Failed to make a copy.',
                    );
                })
                .finally(() => {
                    setCopying(false);
                });

            return;
        }

        if (!editor) return;
        const chain = editor.chain().focus();
        switch (actionId) {
            case 'file:print':    window.print(); break;
            case 'file:export-pdf': onExportPdf(); break;
            case 'edit:undo':    chain.undo().run(); break;
            case 'edit:redo':    chain.redo().run(); break;
            case 'edit:select-all': chain.selectAll().run(); break;
            case 'format:bold':      chain.toggleBold().run(); break;
            case 'format:italic':    chain.toggleItalic().run(); break;
            case 'format:underline': chain.toggleUnderline().run(); break;
            case 'format:strike':    chain.toggleStrike().run(); break;
            case 'format:highlight': chain.toggleHighlight().run(); break;
            case 'format:clear':     chain.clearNodes().unsetAllMarks().run(); break;
            case 'insert:table':   chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
            case 'insert:hr':      chain.setHorizontalRule().run(); break;
        }
    }, [
        copying,
        doc.id,
        doc.status,
        doc.wordCount,
        editingTitle,
        editor,
        importing,
        isReadOnly,
        onExportPdf,
        onTitleEditStart,
        onTitleSave,
        router,
    ]);

    const saveLabel = saveStatus === 'saving' ? 'Saving…'
        : saveStatus === 'saved' ? 'All changes saved'
        : saveStatus === 'error' ? 'Save failed'
        : '';

    return (
        <div className="ded-header">
            {/* Hidden file input — triggered by File → Open */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileImport(file);
                }}
            />

            {/* ── Import progress banner ── */}
            {importing && (
                <div className="ded-import-banner" role="status" aria-live="polite">
                    <span className="ded-import-banner__spinner" aria-hidden="true" />
                    Importing document…
                </div>
            )}

            {/* ── Row 1: menu bar ── */}
            <div className="ded-menubar">
                {/* Left cluster */}
                <div className="ded-menubar__left">
                    <Link href="/documents" className="ded-back-btn" aria-label="Back to documents">
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
                    </Link>
                    <div className="ded-doc-identity">
                        <div className="ded-doc-identity__icon">
                            <span>D</span>
                        </div>
                        <div className="ded-doc-identity__info">
                            {editingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    value={title}
                                    onChange={e => onTitleChange(e.target.value)}
                                    onBlur={onTitleSave}
                                    onKeyDown={onTitleKeyDown}
                                    className="ded-title-input"
                                />
                            ) : (
                                <button className="ded-title-btn" onClick={() => !isReadOnly && onTitleEditStart()}>
                                    {doc.title}
                                </button>
                            )}
                            <div className="ded-doc-identity__meta">
                                <button className="ded-icon-btn" title="Star document" disabled>
                                    <HugeiconsIcon icon={StarIcon} size={14} />
                                </button>
                                <button className="ded-icon-btn" title="Move to folder" disabled>
                                    <HugeiconsIcon icon={FolderOpenIcon} size={14} />
                                </button>
                                {saveLabel && (
                                    <span className={`ded-save-status ded-save-status--${saveStatus}`}>
                                        {saveLabel}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menu strip */}
                <nav className="ded-menubar__nav" aria-label="Document menu">
                    {MENU_BAR.map(m => (
                        <MenuDropdown key={m.label} label={m.label} items={m.items} onAction={handleAction} />
                    ))}
                </nav>

                {/* Right actions */}
                <div className="ded-menubar__right">
                    <button className="ded-icon-btn" title="Version history" disabled>
                        <HugeiconsIcon icon={Clock01Icon} size={17} />
                    </button>
                    <button className="ded-icon-btn" title="Comments" disabled>
                        <HugeiconsIcon icon={Comment01Icon} size={17} />
                    </button>

                    {!isLocked && (
                        <button onClick={onFinalise} className="ded-action-btn ded-action-btn--primary">
                            {isFinalised ? 'Sign document' : 'Finalise & sign'}
                        </button>
                    )}
                    {isLocked && (
                        <>
                            <button onClick={onExportPdf} disabled={exportingPdf} className="ded-action-btn">
                                {exportingPdf ? 'Exporting…' : 'Download PDF'}
                            </button>
                            <button onClick={onViewSignature} className="ded-action-btn">
                                View signature
                            </button>
                        </>
                    )}

                    <button className="ded-share-btn" disabled title="Share (coming soon)">
                        <HugeiconsIcon icon={Share01Icon} size={15} />
                        <span>Share</span>
                    </button>

                    <UserAvatarMenu />
                </div>
            </div>

            {/* ── Row 2: formatting toolbar ── */}
            {editor && !isReadOnly && <DocEditorToolbar editor={editor} />}
        </div>
    );
}
