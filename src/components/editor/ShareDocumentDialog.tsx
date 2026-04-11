/**
 * ShareDocumentDialog
 *
 * Google Docs-style sharing modal. Lets the document owner search for
 * verified users, configure permissions, attach an optional note, and send
 * a secure invitation. Tabs expose current collaborators and the audit log.
 *
 * Sub-components (InviteForm) are defined here because they are not reused
 * outside this dialog. ShareDocumentAccessManager and ShareDocumentAuditLog
 * live in separate files because they are independently substantial.
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
import { ShareDocumentAuditLog } from './ShareDocumentAuditLog';
import { ShareDocumentAccessManager } from './ShareDocumentAccessManager';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEBOUNCE_MS     = 350;
const MIN_QUERY_LEN   = 5;
const PLATFORM_ID_LEN = 11;
const CITIZEN_ID_LEN  = 16;

type AccessTab = 'invite' | 'people' | 'activity';

const PERMISSION_OPTIONS: Array<{
    value: Exclude<CollaboratorPermission, 'READ'>;
    label: string;
    description: string;
}> = [
    { value: 'COMMENT',       label: 'Comment',       description: 'Can review and leave comments'    },
    { value: 'SIGN',          label: 'Sign',           description: 'Can review and sign the document' },
    { value: 'EDIT',          label: 'Edit',           description: 'Can change the document content'  },
    { value: 'MANAGE_ACCESS', label: 'Manage access',  description: 'Can invite and update collaborators' },
];

const SEARCH_PLACEHOLDER: Record<UserSearchMode, string> = {
    email:      'Search by email address…',
    platformId: `Enter full Platform ID (${PLATFORM_ID_LEN} digits)…`,
    citizenId:  `Enter full Citizen ID (${CITIZEN_ID_LEN} digits)…`,
};

const SEARCH_HINT: Record<UserSearchMode, string> = {
    email:      `Type at least ${MIN_QUERY_LEN} characters to search`,
    platformId: `Enter the full Platform ID (${PLATFORM_ID_LEN} digits)`,
    citizenId:  `Enter the full Citizen ID (${CITIZEN_ID_LEN} digits)`,
};

const IDLE_COPY: Record<UserSearchMode, string> = {
    email:      'Enter an email address to find someone to share with',
    platformId: `Enter the full Platform ID (${PLATFORM_ID_LEN} digits) to find someone`,
    citizenId:  `Enter the full Citizen ID (${CITIZEN_ID_LEN} digits) to find someone`,
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** Returns two-letter initials; falls back to the first character of the email. */
function getInitials(user: UserSearchResult): string {
    const f = user.postNames?.[0] ?? '';
    const l = user.surName?.[0] ?? '';
    return (f || l) ? `${f}${l}`.toUpperCase() : user.email[0].toUpperCase();
}

/** Full name when available; email prefix otherwise. */
function getDisplayName(user: UserSearchResult): string {
    return user.postNames || user.surName
        ? `${user.postNames ?? ''} ${user.surName ?? ''}`.trim()
        : user.email.split('@')[0];
}

/** Short label for the matchedBy field. */
function getMatchLabel(user: UserSearchResult): string {
    if (user.matchedBy === 'PLATFORM_ID') return 'Platform ID match';
    if (user.matchedBy === 'CITIZEN_ID')  return 'Citizen ID match';
    return 'Email match';
}

/** Pulls the API error message or returns a safe fallback. */
function extractApiError(error: unknown, fallback: string): string {
    const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
}

// ── InviteForm ────────────────────────────────────────────────────────────────

interface InviteFormProps {
    user: UserSearchResult;
    permissions: CollaboratorPermission[];
    note: string;
    loading: boolean;
    error: string | null;
    canGrantManageAccess: boolean;
    onTogglePermission: (p: Exclude<CollaboratorPermission, 'READ'>) => void;
    onNoteChange: (value: string) => void;
    onDeselect: () => void;
}

/**
 * Permission + note form that appears once the owner selects a recipient.
 * All state is lifted to the parent; this component is purely presentational.
 */
function InviteForm({
    user, permissions, note, loading, error, canGrantManageAccess,
    onTogglePermission, onNoteChange, onDeselect,
}: InviteFormProps) {
    const options = canGrantManageAccess
        ? PERMISSION_OPTIONS
        : PERMISSION_OPTIONS.filter((o) => o.value !== 'MANAGE_ACCESS');

    return (
        <div className="share-invite__form">
            {/* Recipient chip */}
            <div className="share-invite__recipient">
                <div className="share-dialog__avatar" aria-hidden="true">
                    {user.imageUrl
                        ? <img src={user.imageUrl} alt="" className="share-dialog__avatar-img" />
                        : <span className="share-dialog__avatar-initials">{getInitials(user)}</span>
                    }
                </div>
                <div className="share-invite__recipient-body">
                    <p className="share-invite__recipient-meta">Selected recipient</p>
                    <p className="share-invite__recipient-name">{getDisplayName(user)}</p>
                    <p className="share-invite__recipient-email">{user.email}</p>
                </div>
                <button
                    className="share-invite__deselect-btn"
                    onClick={onDeselect}
                    aria-label="Deselect user"
                    disabled={loading}
                >
                    <HugeiconsIcon icon={Cancel01Icon} size={12} />
                </button>
            </div>

            {/* Permissions */}
            <div>
                <p className="share-invite__section-title">Permissions</p>
                <p className="share-invite__section-hint">
                    Read access is always included. Add one or more extra permissions.
                </p>
                <div className="share-invite__perm-grid">
                    {options.map((option) => {
                        const checked = permissions.includes(option.value);
                        return (
                            <label
                                key={option.value}
                                className={`share-invite__perm-option${checked ? ' share-invite__perm-option--checked' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => onTogglePermission(option.value)}
                                />
                                <span>
                                    <span className="share-invite__perm-name">{option.label}</span>
                                    <span className="share-invite__perm-desc">{option.description}</span>
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Note */}
            <div>
                <label htmlFor="share-note" className="share-invite__note-label">
                    Note for the recipient
                </label>
                <textarea
                    id="share-note"
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    placeholder="Optional message for the invited user…"
                    maxLength={1000}
                    className="share-invite__note-field"
                />
            </div>

            {error && <p className="share-invite__error">{error}</p>}
        </div>
    );
}

// ── ShareDocumentDialog ───────────────────────────────────────────────────────

interface ShareDocumentDialogProps {
    documentId: string;
    docTitle: string;
    /** When false, the MANAGE_ACCESS permission option is hidden. */
    canGrantManageAccess?: boolean;
    onClose: () => void;
}

/**
 * Full-featured share dialog. The parent controls open/close state by
 * mounting or unmounting this component.
 */
export function ShareDocumentDialog({
    documentId,
    docTitle,
    canGrantManageAccess = true,
    onClose,
}: ShareDocumentDialogProps) {
    // ── Tab state ──
    const [activeTab,          setActiveTab]          = useState<AccessTab>('invite');
    const [accessCount,        setAccessCount]        = useState(0);
    const [activityCount,      setActivityCount]      = useState(0);
    const [accessRefreshKey,   setAccessRefreshKey]   = useState(0);
    const [activityRefreshKey, setActivityRefreshKey] = useState(0);

    // ── Search state ──
    const [searchMode,  setSearchMode]  = useState<UserSearchMode>('email');
    const [query,       setQuery]       = useState('');
    const [results,     setResults]     = useState<UserSearchResult[]>([]);
    const [selectedId,  setSelectedId]  = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
    const [loading,     setLoading]     = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // ── Invite form state ──
    const [permissions,  setPermissions]  = useState<CollaboratorPermission[]>(['READ']);
    const [note,         setNote]         = useState('');
    const [shareLoading, setShareLoading] = useState(false);
    const [shareError,   setShareError]   = useState<string | null>(null);

    const inputRef    = useRef<HTMLInputElement | null>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-focus the search input on mount.
    useEffect(() => { inputRef.current?.focus(); }, []);

    // Close on Escape.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Clean up the debounce timer on unmount.
    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    const runSearch = useCallback(async (q: string, mode: UserSearchMode) => {
        setLoading(true);
        setSearchError(null);
        try {
            setResults(await searchUsers(q, mode));
            setHasSearched(true);
        } catch (err) {
            setSearchError(extractApiError(err, 'Search failed. Please try again.'));
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    function handleQueryChange(value: string) {
        const next = searchMode !== 'email' ? value.replace(/\D+/g, '') : value;
        setQuery(next);
        setSelectedId(null);
        if (timerRef.current) clearTimeout(timerRef.current);

        const trimmed     = next.trim();
        const requiredLen = searchMode === 'platformId' ? PLATFORM_ID_LEN
            : searchMode === 'citizenId' ? CITIZEN_ID_LEN : null;
        const ready = requiredLen !== null
            ? trimmed.length === requiredLen
            : trimmed.length >= MIN_QUERY_LEN;

        if (!ready) { setResults([]); setHasSearched(false); setSearchError(null); return; }
        timerRef.current = setTimeout(() => void runSearch(trimmed, searchMode), DEBOUNCE_MS);
    }

    function handleModeChange(mode: UserSearchMode) {
        setSearchMode(mode);
        setQuery(''); setResults([]); setSelectedId(null);
        setSelectedUser(null); setHasSearched(false); setSearchError(null);
        if (timerRef.current) clearTimeout(timerRef.current);
        inputRef.current?.focus();
    }

    function handleSelectUser(user: UserSearchResult) {
        setSelectedId(user.id);
        setSelectedUser(user);
        setShareError(null);
    }

    function handleDeselect() {
        setSelectedId(null);
        setSelectedUser(null);
        setShareError(null);
    }

    function handleTogglePermission(permission: Exclude<CollaboratorPermission, 'READ'>) {
        setPermissions((prev) =>
            prev.includes(permission)
                ? prev.filter((p) => p !== permission)
                : [...prev, permission],
        );
    }

    async function handleSendInvitation() {
        if (!selectedUser || shareLoading) return;
        setShareLoading(true);
        setShareError(null);
        try {
            const response = await shareDocumentAccess(documentId, {
                userId: selectedUser.id,
                permissions,
                note: note.trim() || undefined,
            });
            if (response.emailStatus === 'failed') {
                toast.error('Access created, but the invitation email could not be sent.');
            } else {
                toast.success('Invitation sent successfully.');
            }
            setQuery(''); setResults([]); setSelectedId(null);
            setSelectedUser(null); setPermissions(['READ']); setNote('');
            setAccessRefreshKey((k) => k + 1);
            setActivityRefreshKey((k) => k + 1);
            setActiveTab('people');
        } catch (err) {
            setShareError(extractApiError(err, 'Unable to send the invitation right now.'));
        } finally {
            setShareLoading(false);
        }
    }

    const isSendMode = activeTab === 'invite' && Boolean(selectedUser);
    const showHint   = query.length > 0 && (
        searchMode === 'email'
            ? query.trim().length < MIN_QUERY_LEN
            : query.trim().length !== (searchMode === 'platformId' ? PLATFORM_ID_LEN : CITIZEN_ID_LEN)
    );
    const showEmpty   = hasSearched && !loading && results.length === 0 && !searchError;
    const showResults = results.length > 0;

    const footerNote = activeTab === 'activity'
        ? 'Owner-only view. Sensitive network details stay server-side.'
        : activeTab === 'people'
        ? 'Every access change is server-enforced and recorded in the audit trail.'
        : selectedUser
        ? 'The invited user must sign in with the targeted verified account before accepting.'
        : 'Search for a verified user, then choose the permissions to grant.';

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
                            <HugeiconsIcon icon={Share01Icon} size={15} color="var(--color-primary)" />
                        </div>
                        <div>
                            <h2 id="share-dialog-title" className="share-dialog__title">Share document</h2>
                            <p className="share-dialog__doc-name" title={docTitle}>{docTitle}</p>
                        </div>
                    </div>
                    <button className="share-dialog__close-btn" onClick={onClose} aria-label="Close share dialog">
                        <HugeiconsIcon icon={Cancel01Icon} size={15} />
                    </button>
                </div>

                <div className="share-dialog__divider" aria-hidden="true" />

                {/* ── Navigation tabs ── */}
                <div className="share-dialog__tabs" role="tablist" aria-label="Share dialog sections">
                    {(['invite', 'people'] as const).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab}
                            className={`share-dialog__tab${activeTab === tab ? ' share-dialog__tab--active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'invite' ? 'Invite user' : 'People with access'}
                            {tab === 'people' && accessCount > 0 && (
                                <span className="share-dialog__tab-count">{accessCount}</span>
                            )}
                        </button>
                    ))}
                    {canGrantManageAccess && (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'activity'}
                            className={`share-dialog__tab${activeTab === 'activity' ? ' share-dialog__tab--active' : ''}`}
                            onClick={() => setActiveTab('activity')}
                        >
                            Activity
                            {activityCount > 0 && (
                                <span className="share-dialog__tab-count">{activityCount}</span>
                            )}
                        </button>
                    )}
                </div>

                {/* ── Invite tab ── */}
                {activeTab === 'invite' && (
                    <>
                        {/* Search mode switch */}
                        <div className="share-dialog__mode-switch" role="tablist" aria-label="Search mode">
                            {(['email', 'platformId', 'citizenId'] as UserSearchMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    role="tab"
                                    aria-selected={searchMode === mode}
                                    className={`share-dialog__mode-btn${searchMode === mode ? ' share-dialog__mode-btn--active' : ''}`}
                                    onClick={() => handleModeChange(mode)}
                                >
                                    {mode === 'email' ? 'Email' : mode === 'platformId' ? 'Platform ID' : 'Citizen ID'}
                                </button>
                            ))}
                        </div>

                        {/* Search input */}
                        <div className="share-dialog__search-wrap">
                            <div className="share-dialog__search-icon" aria-hidden="true">
                                {loading
                                    ? <span className="share-dialog__search-spinner" />
                                    : <HugeiconsIcon icon={Search01Icon} size={15} color="#9ca3af" />
                                }
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => handleQueryChange(e.target.value)}
                                placeholder={SEARCH_PLACEHOLDER[searchMode]}
                                className="share-dialog__search-input"
                                autoComplete="off"
                                spellCheck={false}
                                aria-label={`Search users by ${searchMode}`}
                                inputMode={searchMode !== 'email' ? 'numeric' : 'email'}
                            />
                            {query.length > 0 && (
                                <button
                                    className="share-dialog__search-clear"
                                    onClick={() => handleQueryChange('')}
                                    aria-label="Clear search"
                                >
                                    <HugeiconsIcon icon={Cancel01Icon} size={12} />
                                </button>
                            )}
                        </div>

                        {/* Scrollable results + form */}
                        <div className="share-dialog__body">
                            {!query && <p className="share-dialog__idle">{IDLE_COPY[searchMode]}</p>}
                            {showHint && <p className="share-dialog__hint">{SEARCH_HINT[searchMode]}</p>}
                            {searchError && <p className="share-dialog__error">{searchError}</p>}
                            {showEmpty && <p className="share-dialog__empty">No users found matching "{query}"</p>}

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
                                                <div className="share-dialog__avatar" aria-hidden="true">
                                                    {user.imageUrl
                                                        ? <img src={user.imageUrl} alt="" className="share-dialog__avatar-img" />
                                                        : <span className="share-dialog__avatar-initials">{getInitials(user)}</span>
                                                    }
                                                </div>
                                                <div className="share-dialog__user-info">
                                                    <span className="share-dialog__user-name">{getDisplayName(user)}</span>
                                                    <span className="share-dialog__user-email">{user.email}</span>
                                                    <span className="share-dialog__user-match">{getMatchLabel(user)}</span>
                                                </div>
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

                            {/* Invite form — appears once a user is selected */}
                            {selectedUser && (
                                <>
                                    <div className="share-invite__divider" aria-hidden="true" />
                                    <InviteForm
                                        user={selectedUser}
                                        permissions={permissions}
                                        note={note}
                                        loading={shareLoading}
                                        error={shareError}
                                        canGrantManageAccess={canGrantManageAccess}
                                        onTogglePermission={handleTogglePermission}
                                        onNoteChange={setNote}
                                        onDeselect={handleDeselect}
                                    />
                                </>
                            )}
                        </div>
                    </>
                )}

                {/* ── People tab ── */}
                {activeTab === 'people' && (
                    <div className="share-dialog__body share-dialog__body--access">
                        <ShareDocumentAccessManager
                            documentId={documentId}
                            canGrantManageAccess={canGrantManageAccess}
                            refreshKey={accessRefreshKey}
                            onCountChange={setAccessCount}
                            onActivityRecorded={() => setActivityRefreshKey((k) => k + 1)}
                        />
                    </div>
                )}

                {/* ── Activity tab ── */}
                {canGrantManageAccess && activeTab === 'activity' && (
                    <div className="share-dialog__body share-dialog__body--access">
                        <ShareDocumentAuditLog
                            documentId={documentId}
                            refreshKey={activityRefreshKey}
                            onCountChange={setActivityCount}
                        />
                    </div>
                )}

                {/* ── Footer ── */}
                <div className="share-dialog__footer">
                    <p className="share-dialog__footer-note">{footerNote}</p>
                    <button
                        className="share-dialog__done-btn"
                        onClick={isSendMode ? handleSendInvitation : onClose}
                        disabled={shareLoading}
                    >
                        {isSendMode ? (shareLoading ? 'Sending…' : 'Send invitation') : 'Done'}
                    </button>
                </div>
            </div>
        </div>
    );
}
