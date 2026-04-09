/**
 * DocumentsPage
 *
 * Google Docs-style listing page. Shows a quick-create strip at the top,
 * a compact status-filter chip row, then a responsive portrait-thumbnail grid.
 * All document actions (open, delete) are surfaced via a hover overlay on
 * each card thumbnail — keeping the resting state clean and scannable.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/components/ui';
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

const FILTER_TABS = [null, 'DRAFT', 'FINALISED', 'LOCKED'] as const;

function getErrorMessage(error: unknown, fallback: string) {
    const message = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
}

export default function DocumentsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const search = searchParams.get('search') ?? '';
    const statusFilter = searchParams.get('status') as DocumentStatus | null;

    const [items, setItems] = useState<DocumentSummary[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const latestLoadRef = useRef(0);

    const load = useCallback(async () => {
        const requestId = ++latestLoadRef.current;
        setLoading(true);
        setLoadError(null);
        try {
            const res = await listDocuments({
                page,
                limit: 20,
                type: 'RICH_TEXT',
                search: search || undefined,
                status: statusFilter || undefined,
            });
            if (requestId !== latestLoadRef.current) return;
            setItems(res.items);
            setTotal(res.total);
        } catch (error: unknown) {
            if (requestId !== latestLoadRef.current) return;
            const message = getErrorMessage(error, 'Failed to load documents.');
            setLoadError(message);
            toast.error(message);
        } finally {
            if (requestId === latestLoadRef.current) setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => {
        void load();
        return () => { latestLoadRef.current += 1; };
    }, [load]);

    async function handleDelete(id: string, title: string) {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            await deleteDocument(id);
            toast.success('Document deleted.');
            void load();
        } catch { toast.error('Failed to delete document.'); }
    }

    function setStatusFilter(s: string | null) {
        const url = new URL(window.location.href);
        if (s) url.searchParams.set('status', s); else url.searchParams.delete('status');
        router.push(url.pathname + url.search);
    }

    const totalPages = Math.max(1, Math.ceil(total / 20));

    return (
        <div className="animate-fade-up">
            {/* ── Quick-create strip ── */}
            <div className="docs-create-strip">
                <p className="docs-create-strip__label">Create new</p>
                <div className="docs-create-strip__row">
                    <Link href="/documents/new" className="docs-create-item" aria-label="Create blank document">
                        <div className="docs-create-item__thumb">
                            <div className="docs-create-item__accent docs-create-item__accent--doc" />
                            <div className="docs-create-item__line docs-create-item__line--h" />
                            <div className="docs-create-item__line" style={{ width: '100%' }} />
                            <div className="docs-create-item__line" style={{ width: '85%' }} />
                            <div className="docs-create-item__line" style={{ width: '92%' }} />
                            <div className="docs-create-item__line" style={{ width: '60%' }} />
                        </div>
                        <span className="docs-create-item__label">Blank document</span>
                    </Link>
                </div>
            </div>

            {/* ── Filters bar ── */}
            <div className="docs-filters">
                <div className="docs-filters__tabs" role="tablist" aria-label="Filter by status">
                    {FILTER_TABS.map((s) => (
                        <button
                            key={s ?? 'all'}
                            role="tab"
                            aria-selected={statusFilter === s}
                            onClick={() => setStatusFilter(s)}
                            className={`docs-filter-tab${statusFilter === s ? ' docs-filter-tab--active' : ''}`}
                        >
                            {s ? STATUS_LABELS[s as DocumentStatus] : 'All'}
                        </button>
                    ))}
                </div>
                <p className="docs-filters__count">
                    {loading ? '' : `${total} ${statusFilter ? STATUS_LABELS[statusFilter].toLowerCase() + ' ' : ''}document${total !== 1 ? 's' : ''}${search ? ` matching "${search}"` : ''}`}
                </p>
            </div>

            {/* ── Document grid ── */}
            {loading ? (
                <div className="docs-skeleton">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="docs-skeleton__card" />
                    ))}
                </div>
            ) : loadError ? (
                <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '28px 24px', textAlign: 'center', display: 'grid', gap: 14 }}>
                    <div>
                        <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            Unable to load your documents
                        </p>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>{loadError}</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <button onClick={() => void load()} className="btn-primary" style={{ fontSize: 12 }}>Try again</button>
                        <Link href="/documents/new" className="btn-ghost" style={{ textDecoration: 'none', fontSize: 12 }}>Create a document</Link>
                    </div>
                </div>
            ) : items.length === 0 ? (
                <div className="docs-empty">
                    <div className="docs-empty__icon">
                        <div className="docs-empty__icon-stripe" />
                        <div className="docs-empty__icon-line docs-empty__icon-line--h" />
                        <div className="docs-empty__icon-line" style={{ width: '100%' }} />
                        <div className="docs-empty__icon-line" style={{ width: '82%' }} />
                        <div className="docs-empty__icon-line" style={{ width: '90%' }} />
                    </div>
                    <p className="docs-empty__heading">
                        {search ? 'No results found' : statusFilter ? `No ${STATUS_LABELS[statusFilter].toLowerCase()} documents` : 'No documents yet'}
                    </p>
                    <p className="docs-empty__sub">
                        {search
                            ? `No documents match "${search}"`
                            : statusFilter
                                ? 'Documents with this status will appear here.'
                                : 'Create your first document to get started.'}
                    </p>
                    {!search && !statusFilter && (
                        <Link href="/documents/new" className="btn-primary" style={{ textDecoration: 'none' }}>
                            Create document
                        </Link>
                    )}
                </div>
            ) : (
                <div className="docs-grid">
                    {items.map((doc) => (
                        <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div className="docs-pagination">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>← Prev</button>
                    <span className="docs-pagination__label">Page {page} of {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>Next →</button>
                </div>
            )}
        </div>
    );
}

// ─── Document Card ─────────────────────────────────────────────────────────────

/** Google Docs-style portrait card with fake-content thumbnail and hover actions. */
function DocumentCard({ doc, onDelete }: { doc: DocumentSummary; onDelete: (id: string, t: string) => void }) {
    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins  = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days  = Math.floor(diff / 86400000);
        if (mins < 1)  return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className="doc-card doc-card--rich-text">
            {/* Thumbnail */}
            <div className="doc-card__thumb">
                <div className="doc-card__thumb-accent" />
                <div className="doc-card__thumb-lines">
                    <div className="doc-card__line doc-card__line--h1" />
                    <div className="doc-card__line doc-card__line--full" />
                    <div className="doc-card__line doc-card__line--long" />
                    <div className="doc-card__line doc-card__line--full" />
                    <div className="doc-card__line doc-card__line--med" />
                    <div className="doc-card__line doc-card__line--full" />
                    <div className="doc-card__line doc-card__line--short" />
                </div>

                <div className="doc-card__badge-wrap">
                    <span className={`badge badge-${doc.status.toLowerCase()}`}>{STATUS_LABELS[doc.status]}</span>
                </div>

                {/* Hover action overlay */}
                <div className="doc-card__hover-actions">
                    <Link
                        href={`/documents/${doc.id}/edit`}
                        className="btn-primary"
                        style={{ textDecoration: 'none', padding: '8px 18px', fontSize: 12 }}
                    >
                        {doc.status === 'LOCKED' ? 'View' : 'Open'}
                    </Link>
                    {(doc.status === 'DRAFT' || doc.status === 'FINALISED') && (
                        <button
                            onClick={() => onDelete(doc.id, doc.title)}
                            className="btn-icon"
                            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error-border)', background: 'rgba(255,255,255,0.9)' }}
                            aria-label={`Delete ${doc.title}`}
                        >
                            🗑
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="doc-card__body">
                <p className="doc-card__title">{doc.title}</p>
                <div className="doc-card__meta">
                    <span>{timeAgo(doc.updatedAt)}</span>
                    {doc.wordCount > 0 && (
                        <>
                            <span className="doc-card__meta-dot" />
                            <span>{doc.wordCount.toLocaleString()} words</span>
                        </>
                    )}
                </div>
                {doc.tags.length > 0 && (
                    <div className="doc-card__tags">
                        {doc.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="doc-card__tag">{tag}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
