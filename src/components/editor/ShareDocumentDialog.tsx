/**
 * ShareDocumentDialog
 *
 * Modal for sharing a document with other users.
 * Provides a debounced user-search input with explicit email, platform-ID,
 * and citizen-ID modes, then lets the owner compose an invitation with
 * additive permissions before it is sent.
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
import {
    shareDocumentAccess,
    type CollaboratorPermission,
} from '@/api/documents.api';
import { toast } from '@/components/ui';
import { ShareDocumentAccessManager } from './ShareDocumentAccessManager';

interface ShareDocumentDialogProps {
    documentId: string;
    docTitle: string;
    canGrantManageAccess?: boolean;
    onClose: () => void;
}

/** Debounce delay in milliseconds before firing the search request. */
const DEBOUNCE_MS = 350;

/** Minimum query length before a search is triggered. */
const MIN_QUERY_LEN = 5;
const PLATFORM_ID_LENGTH = 11;
const CITIZEN_ID_LENGTH = 16;
const SHARE_PERMISSION_OPTIONS: Array<{
    value: Exclude<CollaboratorPermission, 'READ'>;
    label: string;
    description: string;
}> = [
    {
        value: 'COMMENT',
        label: 'Comment',
        description: 'Can review and leave comments',
    },
    {
        value: 'SIGN',
        label: 'Sign',
        description: 'Can review and sign the document',
    },
    {
        value: 'EDIT',
        label: 'Edit',
        description: 'Can change the document content',
    },
    {
        value: 'MANAGE_ACCESS',
        label: 'Manage access',
        description: 'Can invite and update collaborators',
    },
];
const ACCESS_TABS = ['invite', 'people'] as const;
type AccessTab = (typeof ACCESS_TABS)[number];

function isNumericSearchMode(mode: UserSearchMode): boolean {
    return mode === 'platformId' || mode === 'citizenId';
}

function getRequiredLength(mode: UserSearchMode): number | null {
    if (mode === 'platformId') return PLATFORM_ID_LENGTH;
    if (mode === 'citizenId') return CITIZEN_ID_LENGTH;
    return null;
}

function getSearchPlaceholder(mode: UserSearchMode): string {
    if (mode === 'platformId') return 'Enter full Platform ID…';
    if (mode === 'citizenId') return 'Enter full Citizen ID…';
    return 'Search by email address…';
}

function getSearchAriaLabel(mode: UserSearchMode): string {
    if (mode === 'platformId') return 'Search users by full platform ID';
    if (mode === 'citizenId') return 'Search users by full citizen ID';
    return 'Search users by email';
}

function getSearchHint(mode: UserSearchMode): string {
    if (mode === 'platformId') {
        return `Enter the full Platform ID (${PLATFORM_ID_LENGTH} digits)`;
    }

    if (mode === 'citizenId') {
        return `Enter the full Citizen ID (${CITIZEN_ID_LENGTH} digits)`;
    }

    return `Type at least ${MIN_QUERY_LEN} characters to search by email`;
}

function getIdleCopy(mode: UserSearchMode): string {
    if (mode === 'platformId') {
        return `Enter the full Platform ID (${PLATFORM_ID_LENGTH} digits) to find someone to share with`;
    }

    if (mode === 'citizenId') {
        return `Enter the full Citizen ID (${CITIZEN_ID_LENGTH} digits) to find someone to share with`;
    }

    return 'Enter an email address to find someone to share with';
}

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
    documentId,
    docTitle,
    canGrantManageAccess = true,
    onClose,
}: ShareDocumentDialogProps) {
    const [activeTab, setActiveTab]       = useState<AccessTab>('invite');
    const [accessCount, setAccessCount] = useState(0);
    const [accessRefreshKey, setAccessRefreshKey] = useState(0);
    const [searchMode, setSearchMode]   = useState<UserSearchMode>('email');
    const [query, setQuery]             = useState('');
    const [results, setResults]         = useState<UserSearchResult[]>([]);
    const [selectedId, setSelectedId]   = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
    const [loading, setLoading]         = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [sharePermissions, setSharePermissions] = useState<CollaboratorPermission[]>(['READ']);
    const [note, setNote] = useState('');
    const [shareLoading, setShareLoading] = useState(false);
    const [shareError, setShareError] = useState<string | null>(null);

    const inputRef      = useRef<HTMLInputElement>(null);
    const backdropRef   = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const visiblePermissionOptions = canGrantManageAccess
        ? SHARE_PERMISSION_OPTIONS
        : SHARE_PERMISSION_OPTIONS.filter((option) => option.value !== 'MANAGE_ACCESS');

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
        const nextValue = isNumericSearchMode(searchMode)
            ? value.replace(/\D+/g, '')
            : value;
        setQuery(nextValue);
        setSelectedId(null);

        // Cancel any pending debounce.
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        const trimmed = nextValue.trim();
        const requiredLength = getRequiredLength(searchMode);
        const hasEnoughCharacters = searchMode === 'email'
            ? trimmed.length >= MIN_QUERY_LEN
            : trimmed.length === requiredLength;

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
        setSelectedUser(null);
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
        setSelectedUser(user);
        setShareError(null);
    }

    function handleTogglePermission(
        permission: Exclude<CollaboratorPermission, 'READ'>,
    ) {
        setSharePermissions((current) => {
            if (current.includes(permission)) {
                return current.filter((value) => value !== permission);
            }

            return [...current, permission];
        });
    }

    async function handleSendInvitation() {
        if (!selectedUser || shareLoading) {
            return;
        }

        setShareLoading(true);
        setShareError(null);

        try {
            const response = await shareDocumentAccess(documentId, {
                userId: selectedUser.id,
                permissions: sharePermissions,
                note: note.trim() || undefined,
            });

            if (response.emailStatus === 'failed') {
                toast.error('Access was created, but the invitation email could not be sent.');
            } else if (response.emailStatus === 'sent') {
                toast.success('Invitation sent successfully.');
            } else {
                toast.success('Access updated successfully.');
            }

            setQuery('');
            setResults([]);
            setSelectedId(null);
            setSelectedUser(null);
            setSharePermissions(['READ']);
            setNote('');
            setAccessRefreshKey((value) => value + 1);
            setActiveTab('people');
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            setShareError(
                typeof message === 'string' && message.trim()
                    ? message
                    : 'Unable to send the invitation right now.',
            );
        } finally {
            setShareLoading(false);
        }
    }

    const trimmedQuery = query.trim();
    const showHint = searchMode === 'email'
        ? query.length > 0 && trimmedQuery.length < MIN_QUERY_LEN
        : query.length > 0 && trimmedQuery.length !== getRequiredLength(searchMode);
    const showEmpty   = hasSearched && !loading && results.length === 0 && !searchError;
    const showResults = results.length > 0;
    const searchPlaceholder = getSearchPlaceholder(searchMode);
    const searchAriaLabel = getSearchAriaLabel(searchMode);

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

                <div className="share-dialog__tabs" role="tablist" aria-label="Share dialog tabs">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'invite'}
                        className={`share-dialog__tab${activeTab === 'invite' ? ' share-dialog__tab--active' : ''}`}
                        onClick={() => setActiveTab('invite')}
                    >
                        Invite user
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'people'}
                        className={`share-dialog__tab${activeTab === 'people' ? ' share-dialog__tab--active' : ''}`}
                        onClick={() => setActiveTab('people')}
                    >
                        People with access
                        {accessCount > 0 && (
                            <span className="share-dialog__tab-count">{accessCount}</span>
                        )}
                    </button>
                </div>

                {activeTab === 'invite' && (
                    <>
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
                            aria-selected={searchMode === 'platformId'}
                            className={`share-dialog__mode-btn${searchMode === 'platformId' ? ' share-dialog__mode-btn--active' : ''}`}
                            onClick={() => handleSearchModeChange('platformId')}
                        >
                            Platform ID
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={searchMode === 'citizenId'}
                            className={`share-dialog__mode-btn${searchMode === 'citizenId' ? ' share-dialog__mode-btn--active' : ''}`}
                            onClick={() => handleSearchModeChange('citizenId')}
                        >
                            Citizen ID
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
                            inputMode={isNumericSearchMode(searchMode) ? 'numeric' : 'email'}
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
                            {getSearchHint(searchMode)}
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
                            {getIdleCopy(searchMode)}
                        </p>
                    )}

                    {selectedUser && (
                        <div
                            style={{
                                marginTop: 20,
                                borderTop: '1px solid rgba(22, 16, 58, 0.08)',
                                paddingTop: 20,
                                display: 'grid',
                                gap: 16,
                            }}
                        >
                            <div
                                style={{
                                    borderRadius: 18,
                                    border: '1px solid rgba(22, 16, 58, 0.08)',
                                    background: '#fbfaff',
                                    padding: 16,
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 12,
                                        color: 'var(--color-text-muted)',
                                    }}
                                >
                                    Selected recipient
                                </p>
                                <p
                                    style={{
                                        margin: '8px 0 2px',
                                        fontSize: 16,
                                        fontWeight: 700,
                                        color: 'var(--color-text-primary)',
                                    }}
                                >
                                    {getDisplayName(selectedUser)}
                                </p>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 13,
                                        color: 'var(--color-text-secondary)',
                                    }}
                                >
                                    {selectedUser.email}
                                </p>
                            </div>

                            <div>
                                <p
                                    style={{
                                        margin: '0 0 8px',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: 'var(--color-text-primary)',
                                    }}
                                >
                                    Permissions
                                </p>
                                <p
                                    style={{
                                        margin: '0 0 12px',
                                        fontSize: 12,
                                        lineHeight: 1.6,
                                        color: 'var(--color-text-muted)',
                                    }}
                                >
                                    Read access is always included. Add one or many extra permissions as needed.
                                </p>
                                <div
                                    style={{
                                        display: 'grid',
                                        gap: 10,
                                    }}
                                >
                                    {visiblePermissionOptions.map((option) => {
                                        const checked = sharePermissions.includes(option.value);

                                        return (
                                            <label
                                                key={option.value}
                                                style={{
                                                    display: 'flex',
                                                    gap: 12,
                                                    alignItems: 'flex-start',
                                                    borderRadius: 16,
                                                    border: checked
                                                        ? '1px solid rgba(91, 35, 255, 0.25)'
                                                        : '1px solid rgba(22, 16, 58, 0.08)',
                                                    background: checked ? 'rgba(91, 35, 255, 0.04)' : '#fff',
                                                    padding: '12px 14px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => handleTogglePermission(option.value)}
                                                    style={{ marginTop: 2 }}
                                                />
                                                <span>
                                                    <span
                                                        style={{
                                                            display: 'block',
                                                            fontSize: 14,
                                                            fontWeight: 600,
                                                            color: 'var(--color-text-primary)',
                                                        }}
                                                    >
                                                        {option.label}
                                                    </span>
                                                    <span
                                                        style={{
                                                            display: 'block',
                                                            marginTop: 2,
                                                            fontSize: 12,
                                                            lineHeight: 1.6,
                                                            color: 'var(--color-text-muted)',
                                                        }}
                                                    >
                                                        {option.description}
                                                    </span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="share-note"
                                    style={{
                                        display: 'block',
                                        marginBottom: 8,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: 'var(--color-text-primary)',
                                    }}
                                >
                                    Note for the recipient
                                </label>
                                <textarea
                                    id="share-note"
                                    value={note}
                                    onChange={(event) => setNote(event.target.value)}
                                    placeholder="Optional context for the invited user…"
                                    maxLength={1000}
                                    style={{
                                        width: '100%',
                                        minHeight: 104,
                                        resize: 'vertical',
                                        borderRadius: 16,
                                        border: '1px solid rgba(22, 16, 58, 0.12)',
                                        padding: '12px 14px',
                                        fontSize: 14,
                                        lineHeight: 1.6,
                                        color: 'var(--color-text-primary)',
                                        background: '#fff',
                                    }}
                                />
                            </div>

                            {shareError && (
                                <p
                                    style={{
                                        margin: 0,
                                        borderRadius: 14,
                                        padding: '12px 14px',
                                        background: 'rgba(255, 240, 240, 0.9)',
                                        border: '1px solid rgba(199, 77, 77, 0.2)',
                                        color: '#8f2d2d',
                                        fontSize: 13,
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {shareError}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                    </>
                )}

                {activeTab === 'people' && (
                    <div className="share-dialog__body share-dialog__body--access">
                        <ShareDocumentAccessManager
                            documentId={documentId}
                            canGrantManageAccess={canGrantManageAccess}
                            refreshKey={accessRefreshKey}
                            onCountChange={setAccessCount}
                        />
                    </div>
                )}

                {/* ── Footer ── */}
                <div className="share-dialog__footer">
                    <p className="share-dialog__footer-note">
                        {activeTab === 'people'
                            ? 'Every access change is enforced by the server and recorded in the audit trail.'
                            : selectedUser
                                ? 'The invited user must sign in with the targeted verified account before accepting.'
                                : 'Search for a verified user, then choose the permissions you want to send.'}
                    </p>
                    <button
                        className="share-dialog__done-btn"
                        onClick={activeTab === 'invite' && selectedUser ? handleSendInvitation : onClose}
                        disabled={shareLoading}
                    >
                        {activeTab === 'invite' && selectedUser
                            ? shareLoading
                                ? 'Sending…'
                                : 'Send invitation'
                            : 'Done'}
                    </button>
                </div>
            </div>
        </div>
    );
}
