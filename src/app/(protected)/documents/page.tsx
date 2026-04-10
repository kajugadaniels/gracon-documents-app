/**
 * DocumentsPage
 *
 * Google Docs-style listing page. Shows a quick-create strip at the top,
 * an enhanced filter bar (status tabs, starred tab, sort selector), and a
 * responsive portrait-thumbnail card grid.
 *
 * Starred documents are bookmarked client-side via localStorage — no backend
 * endpoint required. Sorting is applied client-side on the fetched page.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/components/ui';
import {
    listDocuments, deleteDocument,
    type DocumentSummary, type DocumentStatus,
} from '@/api/documents.api';
import { useStarred } from '@/lib/hooks/useStarred';
import {
    DocumentCard, DocumentsFilters,
    type StatusFilter, type SortOption,
} from '@/components/pages/documents';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown, fallback: string): string {
    const message = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
}

/**
 * Sorts a document array by the selected sort option.
 * Returns a new array — never mutates the input.
 */
function sortDocuments(items: DocumentSummary[], sort: SortOption): DocumentSummary[] {
    const copy = [...items];
    switch (sort) {
        case 'recent':
            return copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        case 'oldest':
            return copy.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        case 'name-asc':
            return copy.sort((a, b) => a.title.localeCompare(b.title));
        case 'name-desc':
            return copy.sort((a, b) => b.title.localeCompare(a.title));
    }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const search       = searchParams.get('search') ?? '';
    const statusFilter = searchParams.get('status') as DocumentStatus | null;

    const [items,     setItems]     = useState<DocumentSummary[]>([]);
    const [total,     setTotal]     = useState(0);
    const [page,      setPage]      = useState(1);
    const [loading,   setLoading]   = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [sort,      setSort]      = useState<SortOption>('recent');
    const [starredOnly, setStarredOnly] = useState(false);
    const latestLoadRef = useRef(0);

    const { starredIds, isStarred, toggleStar } = useStarred();

    const load = useCallback(async () => {
        const requestId = ++latestLoadRef.current;
        setLoading(true);
        setLoadError(null);
        try {
            const res = await listDocuments({
                page,
                limit: 20,
                type:   'RICH_TEXT',
                search: search || undefined,
                // When starredOnly is on we load all docs then filter client-side
                status: (!starredOnly && statusFilter) ? statusFilter : undefined,
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
    }, [page, search, statusFilter, starredOnly]);

    useEffect(() => {
        void load();
        return () => { latestLoadRef.current += 1; };
    }, [load]);

    /** Items after applying client-side starred filter + sort. */
    const visibleItems = useMemo(() => {
        const filtered = starredOnly
            ? items.filter((d) => starredIds.has(d.id))
            : items;
        return sortDocuments(filtered, sort);
    }, [items, sort, starredOnly, starredIds]);

    const starredCount = useMemo(
        () => items.filter((d) => starredIds.has(d.id)).length,
        [items, starredIds],
    );

    async function handleDelete(id: string, title: string) {
        if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            await deleteDocument(id);
            toast.success('Document deleted.');
            void load();
        } catch {
            toast.error('Failed to delete document.');
        }
    }

    function handleStatusChange(s: StatusFilter) {
        const url = new URL(window.location.href);
        const before = url.pathname + url.search;
        if (s) url.searchParams.set('status', s);
        else   url.searchParams.delete('status');
        const after = url.pathname + url.search;
        // Only push if the URL actually changed — a no-op push resets local state.
        if (before !== after) router.push(after);
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
            <DocumentsFilters
                statusFilter={statusFilter}
                starredOnly={starredOnly}
                starredCount={starredCount}
                sort={sort}
                total={starredOnly ? visibleItems.length : total}
                loading={loading}
                search={search}
                onStatusChange={handleStatusChange}
                onStarredChange={setStarredOnly}
                onSortChange={setSort}
            />

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
            ) : visibleItems.length === 0 ? (
                <div className="docs-empty">
                    <div className="docs-empty__icon">
                        <div className="docs-empty__icon-stripe" />
                        <div className="docs-empty__icon-line docs-empty__icon-line--h" />
                        <div className="docs-empty__icon-line" style={{ width: '100%' }} />
                        <div className="docs-empty__icon-line" style={{ width: '82%' }} />
                        <div className="docs-empty__icon-line" style={{ width: '90%' }} />
                    </div>
                    <p className="docs-empty__heading">
                        {starredOnly
                            ? 'No starred documents'
                            : search
                                ? 'No results found'
                                : statusFilter
                                    ? `No ${statusFilter.toLowerCase()} documents`
                                    : 'No documents yet'}
                    </p>
                    <p className="docs-empty__sub">
                        {starredOnly
                            ? 'Star a document to add it to your favourites.'
                            : search
                                ? `No documents match "${search}"`
                                : statusFilter
                                    ? 'Documents with this status will appear here.'
                                    : 'Create your first document to get started.'}
                    </p>
                    {!search && !statusFilter && !starredOnly && (
                        <Link href="/documents/new" className="btn-primary" style={{ textDecoration: 'none' }}>
                            Create document
                        </Link>
                    )}
                </div>
            ) : (
                <div className="docs-grid">
                    {visibleItems.map((doc) => (
                        <DocumentCard
                            key={doc.id}
                            doc={doc}
                            starred={isStarred(doc.id)}
                            onDelete={handleDelete}
                            onToggleStar={toggleStar}
                        />
                    ))}
                </div>
            )}

            {/* ── Pagination ── */}
            {!starredOnly && totalPages > 1 && (
                <div className="docs-pagination">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>← Prev</button>
                    <span className="docs-pagination__label">Page {page} of {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>Next →</button>
                </div>
            )}
        </div>
    );
}
