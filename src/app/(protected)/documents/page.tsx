'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    listDocuments, deleteDocument,
    type DocumentSummary, type DocumentStatus,
} from '@/api/documents.api';

const STATUS_LABELS: Record<DocumentStatus, string> = {
    DRAFT: 'Draft',
    FINALISED: 'Finalised',
    SIGNED: 'Signed',
    LOCKED: 'Locked',
};

export default function DocumentsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const search = searchParams.get('search') ?? '';
    const statusFilter = searchParams.get('status') as DocumentStatus | null;

    const [items, setItems] = useState<DocumentSummary[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listDocuments({
                page,
                limit: 20,
                search: search || undefined,
                status: statusFilter || undefined,
            });
            setItems(res.items);
            setTotal(res.total);
        } catch { toast.error('Failed to load documents.'); }
        finally { setLoading(false); }
    }, [page, search, statusFilter]);

    useEffect(() => { void load(); }, [load]);

    async function handleDelete(id: string, title: string) {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            await deleteDocument(id);
            toast.success('Document deleted.');
            void load();
        } catch { toast.error('Failed to delete document.'); }
    }

    const totalPages = Math.max(1, Math.ceil(total / 20));

    return (
        <div className="animate-fade-up">
            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                        {statusFilter ? `${STATUS_LABELS[statusFilter]} Documents` : 'My Documents'}
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        {total} document{total !== 1 ? 's' : ''}
                        {search ? ` matching "${search}"` : ''}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <Link href="/documents/new?type=RICH_TEXT" className="btn-ghost" style={{ textDecoration: 'none', fontSize: 12, padding: '9px 18px' }}>
                        📝 New Doc
                    </Link>
                    <Link href="/documents/new?type=SPREADSHEET" className="btn-ghost" style={{ textDecoration: 'none', fontSize: 12, padding: '9px 18px' }}>
                        📊 New Sheet
                    </Link>
                </div>
            </div>

            {/* Status filter tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                {[null, 'DRAFT', 'FINALISED', 'LOCKED'].map((s) => {
                    const active = statusFilter === s;
                    return (
                        <button key={s ?? 'all'} onClick={() => {
                            const url = new URL(window.location.href);
                            if (s) url.searchParams.set('status', s); else url.searchParams.delete('status');
                            router.push(url.pathname + url.search);
                        }}
                            style={{
                                padding: '6px 14px', borderRadius: 9999, border: `1px solid ${active ? 'var(--color-border-primary)' : 'var(--color-border)'}`,
                                background: active ? 'var(--color-primary-subtle)' : 'transparent',
                                color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer',
                            }}
                        >
                            {s ? STATUS_LABELS[s as DocumentStatus] : 'All'}
                        </button>
                    );
                })}
            </div>

            {/* Document grid */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="glass" style={{
                            borderRadius: 'var(--radius-xl)', padding: 20, height: 140,
                            background: 'linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.4) 75%)',
                            backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease infinite'
                        }} />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                    <p style={{ fontSize: 48, margin: '0 0 16px' }}>📭</p>
                    <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>No documents yet</p>
                    <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
                        {search ? `No documents match "${search}"` : 'Create your first document to get started'}
                    </p>
                    {!search && (
                        <Link href="/documents/new?type=RICH_TEXT" className="btn-primary" style={{ textDecoration: 'none' }}>
                            Create Document
                        </Link>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {items.map((doc) => (
                        <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>← Prev</button>
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--color-text-muted)', padding: '0 8px' }}>Page {page} of {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>Next →</button>
                </div>
            )}
        </div>
    );
}

// ─── Document Card ─────────────────────────────────────────────────────────────

function DocumentCard({ doc, onDelete }: { doc: DocumentSummary; onDelete: (id: string, t: string) => void }) {
    const typeIcon = doc.type === 'RICH_TEXT' ? '📄' : '📊';
    const statusClass = `badge badge-${doc.status.toLowerCase()}`;

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className="glass" style={{
            borderRadius: 'var(--radius-xl)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, cursor: 'default',
            transition: 'transform 150ms ease, box-shadow 150ms ease'
        }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(91,35,255,0.12)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
        >
            {/* Top */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {typeIcon}
                </div>
                <span className={statusClass}>{doc.status}</span>
            </div>

            {/* Title */}
            <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {doc.title}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {doc.wordCount.toLocaleString()} words · {timeAgo(doc.updatedAt)}
                </p>
            </div>

            {/* Tags */}
            {doc.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {doc.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{ padding: '2px 8px', borderRadius: 9999, background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', fontSize: 11, border: '1px solid var(--color-border-primary)' }}>
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                <Link href={`/documents/${doc.id}/edit`}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600, boxShadow: 'var(--btn-shadow-rest)' }}>
                    {doc.status === 'LOCKED' ? '👁 View' : '✏️ Edit'}
                </Link>
                {(doc.status === 'DRAFT' || doc.status === 'FINALISED') && (
                    <button onClick={() => onDelete(doc.id, doc.title)} className="btn-icon" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error-border)' }}>
                        🗑
                    </button>
                )}
            </div>
        </div>
    );
}