/**
 * DocumentsFilters
 *
 * Filter + sort control bar for the documents listing page.
 * Renders access-scope and status chip tabs,
 * a Starred tab that filters by locally-bookmarked document IDs,
 * a sort selector (Recent / Oldest / Name A–Z / Name Z–A),
 * and a result-count summary on the right.
 */
'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { StarIcon, SortingIcon } from '@hugeicons/core-free-icons';
import type { DocumentListScope, DocumentStatus } from '@/api/documents.api';

export const STATUS_FILTER_TABS = [null, 'DRAFT', 'FINALISED', 'LOCKED'] as const;
export type StatusFilter = DocumentStatus | null;

export const ACCESS_SCOPE_TABS: { value: DocumentListScope; label: string }[] = [
    { value: 'ALL_ACCESSIBLE', label: 'All documents' },
    { value: 'OWNED', label: 'Owned' },
    { value: 'SHARED_WITH_ME', label: 'Shared with me' },
];

export type SortOption = 'recent' | 'oldest' | 'name-asc' | 'name-desc';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'recent',    label: 'Recent'    },
    { value: 'oldest',    label: 'Oldest'    },
    { value: 'name-asc',  label: 'Name A–Z'  },
    { value: 'name-desc', label: 'Name Z–A'  },
];

const STATUS_LABELS: Record<DocumentStatus, string> = {
    DRAFT:     'Draft',
    FINALISED: 'Finalised',
    SIGNED:    'Signed',
    LOCKED:    'Locked',
};

interface DocumentsFiltersProps {
    /** Which ownership/access scope is active. */
    accessScope: DocumentListScope;
    /** Currently active status filter, or null for "All". */
    statusFilter: StatusFilter;
    /** Whether the Starred tab is currently active. */
    starredOnly: boolean;
    /** Number of starred documents (shown as badge on the Starred tab). */
    starredCount: number;
    /** Active sort option. */
    sort: SortOption;
    /** Total result count to display in the summary. */
    total: number;
    /** True while documents are loading — hides the count. */
    loading: boolean;
    /** Active search term (used in count summary label). */
    search: string;
    onAccessScopeChange: (scope: DocumentListScope) => void;
    onStatusChange: (status: StatusFilter) => void;
    onStarredChange: (active: boolean) => void;
    onSortChange: (sort: SortOption) => void;
}

/**
 * Renders the full filter/sort control bar for the documents page.
 * Status tabs and Starred tab are mutually exclusive — activating one
 * clears the other.
 */
export function DocumentsFilters({
    accessScope,
    statusFilter,
    starredOnly,
    starredCount,
    sort,
    total,
    loading,
    search,
    onAccessScopeChange,
    onStatusChange,
    onStarredChange,
    onSortChange,
}: DocumentsFiltersProps) {
    /** Builds a human-readable summary label for the result count. */
    function countLabel(): string {
        if (loading) return '';
        const noun = total === 1 ? 'document' : 'documents';
        const accessQualifier = accessScope === 'SHARED_WITH_ME'
            ? 'shared '
            : accessScope === 'OWNED'
                ? 'owned '
                : '';
        const qualifier = starredOnly
            ? 'starred '
            : statusFilter
                ? `${STATUS_LABELS[statusFilter].toLowerCase()} `
                : accessQualifier;
        const suffix = search ? ` matching "${search}"` : '';
        return `${total} ${qualifier}${noun}${suffix}`;
    }

    return (
        <div className="docs-filters">
            {/* ── Left: tab strip + starred tab ── */}
            <div className="docs-filters__tabs" aria-label="Filter documents">
                {/* Access-scope tabs */}
                <div className="docs-filters__scope" role="tablist" aria-label="Filter by access">
                    {ACCESS_SCOPE_TABS.map((tab) => {
                        const isActive = accessScope === tab.value;
                        return (
                            <button
                                key={tab.value}
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => {
                                    if (!isActive) {
                                        onStarredChange(false);
                                        onAccessScopeChange(tab.value);
                                    }
                                }}
                                className={`docs-filter-tab docs-filter-tab--scope${isActive ? ' docs-filter-tab--active' : ''}`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Divider */}
                <span className="docs-filters__divider" aria-hidden="true" />

                {/* Status tabs */}
                <div className="docs-filters__status" role="tablist" aria-label="Filter by document status">
                    {STATUS_FILTER_TABS.map((s) => {
                        const isActive = !starredOnly && statusFilter === s;
                        return (
                            <button
                                key={s ?? 'all'}
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => {
                                    // Only push to router if the status is actually changing.
                                    if (!isActive) {
                                        onStarredChange(false);
                                        onStatusChange(s);
                                    }
                                }}
                                className={`docs-filter-tab${isActive ? ' docs-filter-tab--active' : ''}`}
                            >
                                {s ? STATUS_LABELS[s as DocumentStatus] : 'All'}
                            </button>
                        );
                    })}
                </div>

                {/* Divider */}
                <span className="docs-filters__divider" aria-hidden="true" />

                {/* Starred tab */}
                <button
                    aria-pressed={starredOnly}
                    onClick={() => {
                        // Only clear the status URL param if one is currently set —
                        // avoids a router.push('/documents') no-op that resets local state.
                        if (statusFilter !== null) onStatusChange(null);
                        onStarredChange(!starredOnly);
                    }}
                    className={`docs-filter-tab docs-filter-tab--star${starredOnly ? ' docs-filter-tab--active docs-filter-tab--star-active' : ''}`}
                >
                    <HugeiconsIcon
                        icon={StarIcon}
                        size={12}
                        color={starredOnly ? '#f59e0b' : 'currentColor'}
                        fill={starredOnly ? '#f59e0b' : 'none'}
                        strokeWidth={2}
                    />
                    Starred
                    {starredCount > 0 && (
                        <span className="docs-filter-tab__badge">{starredCount}</span>
                    )}
                </button>
            </div>

            {/* ── Right: sort + count ── */}
            <div className="docs-filters__right">
                {/* Sort selector */}
                <div className="docs-sort">
                    <HugeiconsIcon icon={SortingIcon} size={13} color="var(--color-text-muted)" />
                    <select
                        value={sort}
                        onChange={(e) => onSortChange(e.target.value as SortOption)}
                        className="docs-sort__select"
                        aria-label="Sort documents"
                    >
                        {SORT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <p className="docs-filters__count">{countLabel()}</p>
            </div>
        </div>
    );
}
