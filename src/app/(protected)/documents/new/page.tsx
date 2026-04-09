'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { listTemplates, createDocument, type Template } from '@/api/documents.api';

export default function NewDocumentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultType = searchParams.get('type') ?? 'RICH_TEXT';

    const [type, setType] = useState<'RICH_TEXT' | 'SPREADSHEET'>(defaultType as 'RICH_TEXT' | 'SPREADSHEET');
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        listTemplates({ type }).then(setTemplates).catch(() => { });
    }, [type]);

    async function handleCreate(templateId?: string) {
        setCreating(true);
        try {
            const doc = await createDocument({ type, templateId });
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
                    Choose a type and optionally start from a template.
                </p>
            </div>

            {/* Type selector */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
                {[
                    { id: 'RICH_TEXT', icon: '📄', label: 'Document', desc: 'Contracts, letters, agreements' },
                    { id: 'SPREADSHEET', icon: '📊', label: 'Spreadsheet', desc: 'Invoices, budgets, data tables' },
                ].map(({ id, icon, label, desc }) => (
                    <button key={id} onClick={() => setType(id as 'RICH_TEXT' | 'SPREADSHEET')}
                        style={{
                            flex: 1, padding: '20px 16px', borderRadius: 'var(--radius-xl)', textAlign: 'left',
                            border: `2px solid ${type === id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: type === id ? 'var(--color-primary-subtle)' : 'var(--glass-bg)',
                            cursor: 'pointer', transition: 'all 150ms ease',
                        }}
                    >
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: type === id ? 'var(--color-primary)' : 'var(--color-text-primary)', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{desc}</div>
                    </button>
                ))}
            </div>

            {/* Blank option */}
            <div style={{ marginBottom: 24 }}>
                <button onClick={() => handleCreate()} disabled={creating} className="btn-primary" style={{ width: '100%', padding: '14px 0', fontSize: 14 }}>
                    {creating ? '⏳ Creating…' : `Start with Blank ${type === 'RICH_TEXT' ? 'Document' : 'Spreadsheet'}`}
                </button>
            </div>

            {/* Templates */}
            {templates.length > 0 && (
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