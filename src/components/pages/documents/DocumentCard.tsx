/**
 * DocumentCard
 *
 * Google Docs-style portrait thumbnail card for a single document.
 * Shows a fake-content preview, status badge, hover action overlay,
 * and a persistent star button for toggling the document as a favourite.
 */
'use client';

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { StarIcon } from '@hugeicons/core-free-icons';
import type { DocumentSummary, DocumentStatus } from '@/api/documents.api';

export const STATUS_LABELS: Record<DocumentStatus, string> = {
    DRAFT: 'Draft',
    FINALISED: 'Finalised',
    SIGNED: 'Signed',
    LOCKED: 'Locked',
};

/** Converts an ISO timestamp into a human-readable relative time string. */
function timeAgo(date: string): string {
    const diff  = Date.now() - new Date(date).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);
    if (mins  < 1)  return 'Just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 30) return `${days}d ago`;
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface DocumentCardProps {
    doc: DocumentSummary;
    starred: boolean;
    onDelete: (id: string, title: string) => void;
    onToggleStar: (id: string) => void;
}

/**
 * Renders a single document as a portrait-thumbnail card.
 * The star button is always visible and toggles the favourite state.
 * The hover overlay reveals Open / Delete actions.
 */
export function DocumentCard({ doc, starred, onDelete, onToggleStar }: DocumentCardProps) {
    return (
        <div className="doc-card doc-card--rich-text">
            {/* ── Thumbnail ── */}
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

                {/* Status badge — top right */}
                <div className="doc-card__badge-wrap">
                    <span className={`badge badge-${doc.status.toLowerCase()}`}>
                        {STATUS_LABELS[doc.status]}
                    </span>
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
                            style={{
                                color: 'var(--color-error)',
                                borderColor: 'var(--color-error-border)',
                                background: 'rgba(255,255,255,0.9)',
                                fontSize: 12,
                                padding: '7px 10px',
                            }}
                            aria-label={`Delete ${doc.title}`}
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {/* ── Card body ── */}
            <div className="doc-card__body">
                {/* Title row: title + star button */}
                <div className="doc-card__title-row">
                    <p className="doc-card__title">{doc.title}</p>
                    <button
                        onClick={(e) => { e.preventDefault(); onToggleStar(doc.id); }}
                        className={`doc-card__star${starred ? ' doc-card__star--active' : ''}`}
                        aria-label={starred ? `Unstar ${doc.title}` : `Star ${doc.title}`}
                        title={starred ? 'Remove from starred' : 'Add to starred'}
                    >
                        <HugeiconsIcon
                            icon={StarIcon}
                            size={14}
                            color={starred ? '#f59e0b' : 'currentColor'}
                            fill={starred ? '#f59e0b' : 'none'}
                            strokeWidth={starred ? 1.5 : 2}
                        />
                    </button>
                </div>

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
