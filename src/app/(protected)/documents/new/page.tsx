'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui';
import { listTemplates, createDocument, type Template } from '@/api/documents.api';

export default function NewDocumentPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

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

    return (
        <div className="animate-fade-up" style={{ maxWidth: 800 }}>
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
                <button onClick={() => handleCreate()} disabled={creating} className="btn-primary" style={{ width: '100%', padding: '14px 0', fontSize: 14 }}>
                    {creating ? '⏳ Creating…' : 'Start with Blank Document'}
                </button>
            </div>

            {/* Templates */}
            {!loading && templates.length > 0 && (
                <>
                    <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        Or start from a template
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                        {templates.map(t => (
                            <button key={t.id} onClick={() => handleCreate(t.id)} disabled={creating}
                                className="glass" style={{ padding: 20, borderRadius: 'var(--radius-lg)', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--color-border)', transition: 'all 150ms ease' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border-primary)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(91,35,255,0.04)'; }}
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
