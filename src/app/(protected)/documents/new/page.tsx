/**
 * NewDocumentPage
 *
 * Lets the user start a blank rich-text document or import one from their
 * local device before continuing into the editor.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui';
import {
    autosaveDocument,
    createDocument,
    listTemplates,
    type Template,
} from '@/api/documents.api';
import { importDocxToTiptap } from '@/lib/import-docx';

export default function NewDocumentPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLoading(true);
        listTemplates({ type: 'RICH_TEXT' })
            .then(setTemplates)
            .catch(() => {
                toast.error('Failed to load templates.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    async function handleCreate(templateId?: string) {
        setCreating(true);
        try {
            const doc = await createDocument({ type: 'RICH_TEXT', templateId });
            router.replace(`/documents/${doc.id}/edit`);
        } catch {
            toast.error('Failed to create document.');
            setCreating(false);
        }
    }

    async function handleImport(file: File) {
        setImporting(true);
        const importToastId = toast.loading('Importing document…');

        try {
            const { content, title } = await importDocxToTiptap(file);
            const doc = await createDocument({ type: 'RICH_TEXT', title });
            await autosaveDocument(doc.id, content);
            toast.dismiss(importToastId);
            toast.success(`"${title}" imported`);
            router.replace(`/documents/${doc.id}/edit`);
        } catch (error: unknown) {
            toast.dismiss(importToastId);
            const message = error instanceof Error
                ? error.message
                : 'Failed to import document.';
            toast.error(message);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    return (
        <div className="animate-fade-up" style={{ maxWidth: 800 }}>
            <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc"
                style={{ display: 'none' }}
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleImport(file);
                }}
            />

            <div style={{ marginBottom: 32 }}>
                <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                    New Document
                </h1>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                    Start a rich text document from a blank page or a template.
                </p>
            </div>

            {/* Blank option */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    <button
                        onClick={() => handleCreate()}
                        disabled={creating || importing}
                        className="btn-primary"
                        style={{ width: '100%', padding: '14px 0', fontSize: 14 }}
                    >
                        {creating ? '⏳ Creating…' : 'Start with Blank Document'}
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={creating || importing}
                        className="glass"
                        style={{
                            width: '100%',
                            padding: '14px 18px',
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            borderRadius: '9999px',
                            border: '1px solid var(--color-border)',
                            cursor: creating || importing ? 'not-allowed' : 'pointer',
                            opacity: creating || importing ? 0.65 : 1,
                            transition: 'border-color 150ms ease, background 150ms ease',
                        }}
                        onMouseEnter={(event) => {
                            if (creating || importing) return;
                            event.currentTarget.style.borderColor = 'var(--color-border-primary)';
                            event.currentTarget.style.background = 'rgba(91,35,255,0.04)';
                        }}
                        onMouseLeave={(event) => {
                            event.currentTarget.style.borderColor = 'var(--color-border)';
                            event.currentTarget.style.background = 'var(--glass-bg)';
                        }}
                    >
                        {importing ? 'Importing…' : 'Import Document'}
                    </button>
                </div>
            </div>

            {/* Templates */}
            {!loading && templates.length > 0 && (
                <>
                    <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        Or start from a template
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                        {templates.map(t => (
                            <button key={t.id} onClick={() => handleCreate(t.id)} disabled={creating || importing}
                                className="glass" style={{ padding: 20, borderRadius: 'var(--radius-lg)', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--color-border)', transition: 'all 150ms ease' }}
                                onMouseEnter={e => { if (creating || importing) return; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border-primary)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(91,35,255,0.04)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg)'; }}
                            >
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>{t.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{t.description}</div>
                                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--color-primary)', fontWeight: 600 }}>Use template →</div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
