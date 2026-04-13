/**
 * DocEditorHeader
 *
 * Google Docs-style two-row sticky editor header.
 * Row 1 (menu bar): logo/back, document title, menu strip (File … Help), right actions.
 * Row 2 (toolbar):  formatting toolbar via DocEditorToolbar.
 * Row 3 (find bar): inline find bar, shown when Edit → Find is active.
 *
 * All action handling is delegated to useEditorActions.
 * Menu rendering is handled by MenuDropdown.
 * Find-in-document is handled by EditorFindBar.
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { Editor } from '@tiptap/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    ArrowLeft01Icon, StarIcon, FolderOpenIcon,
    Share01Icon, Comment01Icon, Clock01Icon,
} from '@hugeicons/core-free-icons';
import type { DigitalCertificateActionStatus } from '@/components/editor/use-digital-certificate-status';
import type { DocumentDetail } from '@/api/documents.api';
import { MENU_BAR } from '@/constants';
import { DocEditorToolbar } from './DocEditorToolbar';
import { DocEditorSignatureAction } from './DocEditorSignatureAction';
import { ShareDocumentDialog } from './ShareDocumentDialog';
import { MenuDropdown } from './MenuDropdown';
import { EditorUserAvatarMenu } from './EditorUserAvatarMenu';
import { EditorFindBar } from './EditorFindBar';
import { useEditorActions } from './use-editor-actions';

interface DocEditorHeaderProps {
    editor: Editor | null;
    doc: DocumentDetail;
    shareActivityRefreshKey: number;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    editingTitle: boolean;
    title: string;
    onTitleChange: (v: string) => void;
    onTitleSave: () => void | Promise<void>;
    onTitleEditStart: () => void;
    onTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    isReadOnly: boolean;
    isLocked: boolean;
    canShare: boolean;
    canComment?: boolean;
    canFinalise: boolean;
    canLock: boolean;
    canSign: boolean;
    canViewSignature: boolean;
    certificateStatus: DigitalCertificateActionStatus;
    onOpenComments?: () => void;
    onShareActivityRecorded: () => void;
    onApplyForDigitalSignature: () => void;
    onFinalise: () => void;
    onLock: () => void;
    onSign: () => void;
    onViewSignature: () => void;
}

/** Full Google Docs-style two-row sticky header for the document editor. */
export function DocEditorHeader({
    editor, doc, shareActivityRefreshKey, saveStatus, editingTitle, title,
    onTitleChange, onTitleSave, onTitleEditStart, onTitleKeyDown,
    isReadOnly, isLocked, canShare, canComment = false,
    canFinalise, canLock, canSign, canViewSignature,
    certificateStatus, onOpenComments, onShareActivityRecorded,
    onApplyForDigitalSignature, onFinalise, onLock, onSign, onViewSignature,
}: DocEditorHeaderProps) {
    const [shareOpen, setShareOpen] = useState(false);
    const [findOpen,  setFindOpen]  = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    const { importing, fileInputRef, handleFileImport, handleAction } = useEditorActions({
        editor, doc, editingTitle, title, isReadOnly,
        onTitleEditStart, onTitleSave,
        onFindToggle: () => setFindOpen((v) => !v),
    });

    // Focus and select the title input whenever editing begins
    useEffect(() => {
        if (!editingTitle || !titleInputRef.current) return;
        titleInputRef.current.focus();
        titleInputRef.current.select();
    }, [editingTitle]);

    const saveLabel = saveStatus === 'saving' ? 'Saving…'
        : saveStatus === 'saved'  ? 'All changes saved'
        : saveStatus === 'error'  ? 'Save failed'
        : '';

    return (
        <div className="ded-header">
            {/* Hidden file input — triggered by File → Open */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc"
                style={{ display: 'none' }}
                onChange={e => {
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
                {/* Left cluster: back button + document identity */}
                <div className="ded-menubar__left">
                    <Link href="/documents" className="ded-back-btn" aria-label="Back to documents">
                        <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
                    </Link>
                    <div className="ded-doc-identity">
                        <div className="ded-doc-identity__icon"><span>D</span></div>
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
                                <button
                                    className="ded-title-btn"
                                    onClick={() => !isReadOnly && onTitleEditStart()}
                                >
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
                    <button
                        className="ded-icon-btn"
                        title={canComment ? 'Comments' : 'View comments'}
                        disabled={!onOpenComments}
                        onClick={onOpenComments}
                    >
                        <HugeiconsIcon icon={Comment01Icon} size={17} />
                    </button>

                    {!isLocked && (canFinalise || canLock || canSign) && (
                        <DocEditorSignatureAction
                            certificateStatus={certificateStatus}
                            canFinalise={canFinalise}
                            canLock={canLock}
                            canSign={canSign}
                            onApplyForDigitalSignature={onApplyForDigitalSignature}
                            onFinalise={onFinalise}
                            onLock={onLock}
                            onSign={onSign}
                        />
                    )}
                    {canViewSignature && isLocked && (
                        <button onClick={onViewSignature} className="ded-action-btn">
                            View signature
                        </button>
                    )}

                    {canShare && (
                        <button
                            className="ded-share-btn"
                            onClick={() => setShareOpen(true)}
                            title="Share document"
                        >
                            <HugeiconsIcon icon={Share01Icon} size={15} />
                            <span>Share</span>
                        </button>
                    )}

                    <EditorUserAvatarMenu />
                </div>
            </div>

            {/* ── Row 2: formatting toolbar ── */}
            {editor && !isReadOnly && <DocEditorToolbar editor={editor} />}

            {/* ── Row 3: find bar ── */}
            {findOpen && editor && (
                <EditorFindBar editor={editor} onClose={() => setFindOpen(false)} />
            )}

            {/* ── Share dialog ── */}
            {shareOpen && (
                <ShareDocumentDialog
                    documentId={doc.id}
                    docTitle={doc.title}
                    canGrantManageAccess={doc.access?.isOwner ?? true}
                    activityRefreshKey={shareActivityRefreshKey}
                    onActivityRecorded={onShareActivityRecorded}
                    onClose={() => setShareOpen(false)}
                />
            )}
        </div>
    );
}
