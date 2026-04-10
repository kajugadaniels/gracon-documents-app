/**
 * ShareDocumentDialog
 *
 * Modal for sharing a document with other users.
 * Provides a debounced user-search input — results appear after the user
 * has typed at least 5 characters. Selecting a result highlights the row.
 *
 * Sharing logic is intentionally deferred — the component exposes the
 * selected user via `onSelectUser` for the parent to wire up later.
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Search01Icon, Share01Icon } from '@hugeicons/core-free-icons';
import {
    searchUsers,
    type UserSearchMode,
    type UserSearchResult,
} from '@/api/auth/search-users.api';

interface ShareDocumentDialogProps {
    docTitle: string;
    onSelectUser: (user: UserSearchResult) => void;
    onClose: () => void;
}

/** Debounce delay in milliseconds before firing the search request. */
const DEBOUNCE_MS = 350;

/** Minimum query length before a search is triggered. */
const MIN_QUERY_LEN = 5;
const PLATFORM_ID_LENGTH = 11;
const CITIZEN_ID_LENGTH = 16;

/**
 * Returns the initials for a user result — two letters max.
 * Falls back to the first letter of the email.
 */
function getInitials(user: UserSearchResult): string {
    const first = user.postNames?.[0] ?? '';
    const last  = user.surName?.[0]   ?? '';
    if (first || last) return `${first}${last}`.toUpperCase();
    return user.email[0].toUpperCase();
}

/** Full display name — falls back to email prefix when name is unavailable. */
function getDisplayName(user: UserSearchResult): string {
    if (user.postNames || user.surName) {
        return `${user.postNames ?? ''} ${user.surName ?? ''}`.trim();
    }
    return user.email.split('@')[0];
}

/**
 * Google Docs-style share dialog with live user search.
 * The parent controls open/close state — unmounting the component closes it.
 */
function getMatchLabel(user: UserSearchResult): string {
    switch (user.matchedBy) {
        case 'PLATFORM_ID':
            return 'Matched by Platform ID';
        case 'CITIZEN_ID':
            return 'Matched by Citizen ID';
        default:
            return 'Matched by email';
    }
}

export function ShareDocumentDialog({
    docTitle,
    onSelectUser,
    onClose,
}: ShareDocumentDialogProps) {
    const [searchMode, setSearchMode]   = useState<UserSearchMode>('email');
    const [query, setQuery]             = useState('');
    const [results, setResults]         = useState<UserSearchResult[]>([]);
    const [selectedId, setSelectedId]   = useState<string | null>(null);
    const [loading, setLoading]         = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const inputRef      = useRef<HTMLInputElement>(null);
    const backdropRef   = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-focus input on mount.
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Close on Escape.
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const runSearch = useCallback(async (q: string, mode: UserSearchMode) => {
        setLoading(true);
        setSearchError(null);
        try {
            const data = await searchUsers(q, mode);
            setResults(data);
            setHasSearched(true);
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            setSearchError(
                typeof message === 'string' && message.trim()
                    ? message
                    : 'Search failed. Please try again.',
            );
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    function handleQueryChange(value: string) {
        const nextValue = searchMode === 'id' ? value.replace(/\D+/g, '') : value;
        setQuery(nextValue);
        setSelectedId(null);

        // Cancel any pending debounce.
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        const trimmed = nextValue.trim();
        const hasEnoughCharacters = searchMode === 'email'
            ? trimmed.length >= MIN_QUERY_LEN
            : trimmed.length === PLATFORM_ID_LENGTH || trimmed.length === CITIZEN_ID_LENGTH;

        if (!hasEnoughCharacters) {
            setResults([]);
            setHasSearched(false);
            setSearchError(null);
            return;
        }

        debounceTimer.current = setTimeout(() => {
            void runSearch(trimmed, searchMode);
        }, DEBOUNCE_MS);
    }

    function handleSearchModeChange(mode: UserSearchMode) {
        setSearchMode(mode);
        setQuery('');
        setResults([]);
        setSelectedId(null);
        setHasSearched(false);
        setSearchError(null);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        inputRef.current?.focus();
    }

    // Cleanup timer on unmount.
    useEffect(() => () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
    }, []);

    function handleSelectUser(user: UserSearchResult) {
        setSelectedId(user.id);
        onSelectUser(user);
    }

    const trimmedQuery = query.trim();
    const showHint = searchMode === 'email'
        ? query.length > 0 && trimmedQuery.length < MIN_QUERY_LEN
        : query.length > 0
            && trimmedQuery.length !== PLATFORM_ID_LENGTH
            && trimmedQuery.length !== CITIZEN_ID_LENGTH;
    const showEmpty   = hasSearched && !loading && results.length === 0 && !searchError;
    const showResults = results.length > 0;
    const searchPlaceholder = searchMode === 'email'
        ? 'Search by email address…'
        : 'Enter full Platform ID or Citizen ID…';
    const searchAriaLabel = searchMode === 'email'
        ? 'Search users by email'
        : 'Search users by full platform ID or citizen ID';

    return (
        <div
            ref={backdropRef}
            className="share-dialog-backdrop"
            onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
        >
            <div className="share-dialog">
                {/* ── Header ── */}
                <div className="share-dialog__header">
                    <div className="share-dialog__header-left">
                        <div className="share-dialog__header-icon" aria-hidden="true">
                            <HugeiconsIcon icon={Share01Icon} size={16} color="var(--color-primary)" />
                        </div>
                        <div>
                            <h2 id="share-dialog-title" className="share-dialog__title">
                                Share document
                            </h2>
                            <p className="share-dialog__doc-name" title={docTitle}>
                                {docTitle}
                            </p>
                        </div>
                    </div>
                    <button
                        className="share-dialog__close-btn"
                        onClick={onClose}
                        aria-label="Close share dialog"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} size={16} />
                    </button>
                </div>

                {/* ── Divider ── */}
                <div className="share-dialog__divider" aria-hidden="true" />

                <div className="share-dialog__mode-switch" role="tablist" aria-label="Search mode">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={searchMode === 'email'}
                        className={`share-dialog__mode-btn${searchMode === 'email' ? ' share-dialog__mode-btn--active' : ''}`}
                        onClick={() => handleSearchModeChange('email')}
                    >
                        Email
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={searchMode === 'id'}
                        className={`share-dialog__mode-btn${searchMode === 'id' ? ' share-dialog__mode-btn--active' : ''}`}
                        onClick={() => handleSearchModeChange('id')}
                    >
                        Numeric ID
                    </button>
                </div>

                {/* ── Search input ── */}
                <div className="share-dialog__search-wrap">
                    <div className="share-dialog__search-icon" aria-hidden="true">
                        {loading
                            ? <span className="share-dialog__search-spinner" />
                            : <HugeiconsIcon icon={Search01Icon} size={16} color="#9ca3af" />
                        }
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="share-dialog__search-input"
                        autoComplete="off"
                        spellCheck={false}
                        aria-label={searchAriaLabel}
                        aria-describedby="share-search-hint"
                        inputMode={searchMode === 'id' ? 'numeric' : 'email'}
                    />
                    {query.length > 0 && (
                        <button
                            className="share-dialog__search-clear"
                            onClick={() => handleQueryChange('')}
                            aria-label="Clear search"
                        >
                            <HugeiconsIcon icon={Cancel01Icon} size={13} />
                        </button>
                    )}
                </div>

                {/* ── Hint / results / empty state ── */}
                <div className="share-dialog__body">
                    {showHint && (
                        <p id="share-search-hint" className="share-dialog__hint">
                            {searchMode === 'email'
                                ? `Type at least ${MIN_QUERY_LEN} characters to search by email`
                                : `Enter the full Platform ID (${PLATFORM_ID_LENGTH} digits) or Citizen ID (${CITIZEN_ID_LENGTH} digits)`}
                        </p>
                    )}

                    {searchError && (
                        <p className="share-dialog__error">{searchError}</p>
                    )}

                    {showEmpty && (
                        <p className="share-dialog__empty">No users found matching "{query}"</p>
                    )}

                    {showResults && (
                        <ul className="share-dialog__results" role="listbox" aria-label="Search results">
                            {results.map((user) => {
                                const isSelected = selectedId === user.id;
                                return (
                                    <li
                                        key={user.id}
                                        role="option"
                                        aria-selected={isSelected}
                                        className={`share-dialog__result${isSelected ? ' share-dialog__result--selected' : ''}`}
                                        onClick={() => handleSelectUser(user)}
                                    >
                                        {/* Avatar */}
                                        <div className="share-dialog__avatar" aria-hidden="true">
                                            {user.imageUrl
                                                ? <img src={user.imageUrl} alt={getInitials(user)} className="share-dialog__avatar-img" />
                                                : <span className="share-dialog__avatar-initials">{getInitials(user)}</span>
                                            }
                                        </div>

                                        {/* User info */}
                                        <div className="share-dialog__user-info">
                                            <span className="share-dialog__user-name">
                                                {getDisplayName(user)}
                                            </span>
                                            <span className="share-dialog__user-email">
                                                {user.email}
                                            </span>
                                            <span className="share-dialog__user-match">
                                                {getMatchLabel(user)}
                                            </span>
                                        </div>

                                        {/* Selected checkmark */}
                                        {isSelected && (
                                            <div className="share-dialog__check" aria-hidden="true">
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <circle cx="8" cy="8" r="8" fill="var(--color-primary)" />
                                                    <path d="M4.5 8l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {/* Idle state — nothing typed yet */}
                    {!query && (
                        <p className="share-dialog__idle">
                            {searchMode === 'email'
                                ? 'Enter an email address to find someone to share with'
                                : `Enter the full Platform ID (${PLATFORM_ID_LENGTH} digits) or Citizen ID (${CITIZEN_ID_LENGTH} digits) to find someone to share with`}
                        </p>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="share-dialog__footer">
                    <p className="share-dialog__footer-note">
                        Sharing functionality coming soon
                    </p>
                    <button
                        className="share-dialog__done-btn"
                        onClick={onClose}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
