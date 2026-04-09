'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui';
import { listTemplates, createDocument, type Template } from '@/api/documents.api';

const CATEGORY_LABELS: Record<string, string> = {
    CONTRACT: 'Contracts',
    LEGAL: 'Legal',
    FINANCIAL: 'Financial',
    CORRESPONDENCE: 'Correspondence',
    RESOLUTION: 'Resolutions',
    OTHER: 'Other',
};

export default function TemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState<string | null>(null);
    const [category, setCategory] = useState<string | null>(null);

    useEffect(() => {
        listTemplates({ type: 'RICH_TEXT' })
            .then(setTemplates)
            .catch(() => toast.error('Failed to load templates.'))
            .finally(() => setLoading(false));
    }, []);

    async function handleUse(templateId: string) {
        setCreating(templateId);
        try {
            const doc = await createDocument({ type: 'RICH_TEXT', templateId });
            router.push(`/documents/${doc.id}/edit`);
        } catch { toast.error('Failed to create from template.'); setCreating(null); }
    }

    const categories = [...new Set(templates.map(t => t.category))];
    const filtered = category ? templates.filter(t => t.category === category) : templates;

    return (
        <div className="animate-fade-up">
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>Templates</h1>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    Start with a professionally structured template. Your verified identity is automatically filled in.
                </p>
            </div>

            {/* Category filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
                <button onClick={() => setCategory(null)} style={{ padding: '6px 14px', borderRadius: 9999, border: `1px solid ${!category ? 'var(--color-border-primary)' : 'var(--color-border)'}`, background: !category ? 'var(--color-primary-subtle)' : 'transparent', color: !category ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontSize: 12, fontWeight: !category ? 600 : 400, cursor: 'pointer' }}>
                    All
                </button>
                {categories.map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '6px 14px', borderRadius: 9999, border: `1px solid ${category === cat ? 'var(--color-border-primary)' : 'var(--color-border)'}`, background: category === cat ? 'var(--color-primary-subtle)' : 'transparent', color: category === cat ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontSize: 12, fontWeight: category === cat ? 600 : 400, cursor: 'pointer' }}>
                        {CATEGORY_LABELS[cat] ?? cat}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="glass" style={{ borderRadius: 'var(--radius-xl)', height: 180 }} />
                    ))}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {filtered.map(t => (
                        <div key={t.id} className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24, display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform 150ms ease' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = 'none'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontSize: 24 }}>📄</span>
                                <span style={{ padding: '3px 10px', borderRadius: 9999, background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', fontSize: 11, fontWeight: 600, border: '1px solid var(--color-border-primary)' }}>
                                    {CATEGORY_LABELS[t.category] ?? t.category}
                                </span>
                            </div>

                            <div>
                                <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{t.name}</p>
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{t.description}</p>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Used {t.usageCount.toLocaleString()} times</span>
                                <button onClick={() => handleUse(t.id)} disabled={creating === t.id} className="btn-primary" style={{ padding: '8px 18px', fontSize: 12 }}>
                                    {creating === t.id ? 'Creating…' : 'Use →'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
