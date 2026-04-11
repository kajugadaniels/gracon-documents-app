/**
 * ShareDocumentAccessManager
 *
 * Lists current collaborators and pending invitations for a document, then
 * lets an authorized user update permissions, resend an invitation, or revoke
 * access. Revocation uses an inline confirm overlay instead of window.confirm
 * so the UX stays smooth and native browser dialogs are avoided.
 */
'use client';

import { useEffect, useState } from 'react';
import { useSessionUser } from '@/app/(protected)/layout';
import {
    getDocumentAccessList,
    resendDocumentInvitation,
    revokeDocumentAccess,
    updateDocumentAccess,
    type CollaboratorPermission,
    type DocumentCollaboratorAccess,
} from '@/api/documents.api';
import { toast } from '@/components/ui';

// ── Constants ─────────────────────────────────────────────────────────────────

const PERMISSION_ORDER: CollaboratorPermission[] = ['READ', 'COMMENT', 'SIGN', 'EDIT', 'MANAGE_ACCESS'];

const ACCESS_PERMISSION_OPTIONS: Array<{ value: Exclude<CollaboratorPermission, 'READ'>; label: string }> = [
    { value: 'COMMENT',       label: 'Comment'       },
    { value: 'SIGN',          label: 'Sign'          },
    { value: 'EDIT',          label: 'Edit'          },
    { value: 'MANAGE_ACCESS', label: 'Manage access' },
];

// ── Pure helpers ──────────────────────────────────────────────────────────────

function normalizePermissions(permissions: CollaboratorPermission[]): CollaboratorPermission[] {
    const unique = new Set<CollaboratorPermission>(permissions);
    unique.add('READ');
    return PERMISSION_ORDER.filter((p) => unique.has(p));
}

function permissionSetsMatch(left: CollaboratorPermission[], right: CollaboratorPermission[]): boolean {
    return normalizePermissions(left).join('|') === normalizePermissions(right).join('|');
}

function togglePermission(
    permissions: CollaboratorPermission[],
    permission: Exclude<CollaboratorPermission, 'READ'>,
): CollaboratorPermission[] {
    const normalized = normalizePermissions(permissions);
    return normalized.includes(permission)
        ? normalized.filter((p) => p !== permission)
        : normalizePermissions([...normalized, permission]);
}

function formatDate(value: string | null): string | null {
    if (!value) return null;
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getAccessInitials(access: DocumentCollaboratorAccess): string {
    const f = access.user.postNames?.[0] ?? '';
    const l = access.user.surName?.[0] ?? '';
    return (f || l) ? `${f}${l}`.toUpperCase() : access.user.email[0].toUpperCase();
}

function getAccessStatus(access: DocumentCollaboratorAccess) {
    if (access.invitationStatus === 'ACCEPTED' && access.isActive) {
        return { label: 'Has access', detail: `Accepted ${formatDate(access.acceptedAt) ?? 'recently'}`,              tone: 'active'   };
    }
    if (access.invitationStatus === 'PENDING') {
        return { label: 'Pending',    detail: `Expires ${formatDate(access.invitationExpiresAt) ?? 'soon'}`,           tone: 'pending'  };
    }
    if (access.invitationStatus === 'DECLINED') {
        return { label: 'Declined',   detail: `Declined ${formatDate(access.declinedAt) ?? 'the invitation'}`,        tone: 'muted'    };
    }
    if (access.invitationStatus === 'REVOKED') {
        return { label: 'Revoked',    detail: `Removed ${formatDate(access.revokedAt) ?? 'from access'}`,             tone: 'danger'   };
    }
    return     { label: 'Expired',   detail: `Expired ${formatDate(access.invitationExpiresAt) ?? 'recently'}`,       tone: 'muted'    };
}

function extractApiError(error: unknown, fallback: string): string {
    const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
}

// ── SkeletonLoader ────────────────────────────────────────────────────────────

/** Three animated placeholder cards shown while the access list loads. */
function SkeletonLoader() {
    return (
        <div className="share-dialog__access-list">
            {[0, 1, 2].map((i) => (
                <div key={i} className="share-skeleton">
                    <div className="share-skeleton__avatar" />
                    <div className="share-skeleton__lines">
                        <div className="share-skeleton__line" />
                        <div className="share-skeleton__line" />
                        <div className="share-skeleton__line" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ShareDocumentAccessManagerProps {
    documentId: string;
    canGrantManageAccess: boolean;
    refreshKey: number;
    onCountChange: (count: number) => void;
    onActivityRecorded: () => void;
}

/** Renders the access list and exposes collaborator management actions. */
export function ShareDocumentAccessManager({
    documentId,
    canGrantManageAccess,
    refreshKey,
    onCountChange,
    onActivityRecorded,
}: ShareDocumentAccessManagerProps) {
    const currentUser = useSessionUser();
    const [items,          setItems]          = useState<DocumentCollaboratorAccess[]>([]);
    const [drafts,         setDrafts]         = useState<Record<string, CollaboratorPermission[]>>({});
    const [loading,        setLoading]        = useState(true);
    const [error,          setError]          = useState<string | null>(null);
    const [busyId,         setBusyId]         = useState<string | null>(null);
    const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

    const permissionOptions = canGrantManageAccess
        ? ACCESS_PERMISSION_OPTIONS
        : ACCESS_PERMISSION_OPTIONS.filter((o) => o.value !== 'MANAGE_ACCESS');

    async function loadAccessList() {
        setLoading(true);
        setError(null);
        try {
            const response = await getDocumentAccessList(documentId);
            setItems(response.collaborators);
            setDrafts(Object.fromEntries(
                response.collaborators.map((item) => [item.id, normalizePermissions(item.permissions)]),
            ));
            onCountChange(response.collaborators.length);
        } catch (loadError: unknown) {
            setError(extractApiError(loadError, 'Unable to load people with access.'));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void loadAccessList(); }, [documentId, refreshKey]);

    function replaceItem(updated: DocumentCollaboratorAccess) {
        setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
        setDrafts((current) => ({ ...current, [updated.id]: normalizePermissions(updated.permissions) }));
    }

    async function saveAccess(access: DocumentCollaboratorAccess) {
        setBusyId(`${access.id}:save`);
        try {
            const updated = await updateDocumentAccess(documentId, access.id, drafts[access.id] ?? access.permissions);
            replaceItem(updated);
            onActivityRecorded();
            toast.success('Access permissions updated.');
        } catch (saveError: unknown) {
            toast.error(extractApiError(saveError, 'Unable to update permissions.'));
        } finally {
            setBusyId(null);
        }
    }

    async function resendAccess(access: DocumentCollaboratorAccess) {
        setBusyId(`${access.id}:resend`);
        try {
            const updated = await resendDocumentInvitation(documentId, access.id);
            replaceItem(updated);
            onActivityRecorded();
            toast[updated.emailStatus === 'failed' ? 'error' : 'success'](
                updated.emailStatus === 'failed'
                    ? 'Token refreshed, but email delivery failed.'
                    : 'Invitation email resent.',
            );
        } catch (resendError: unknown) {
            toast.error(extractApiError(resendError, 'Unable to resend invitation.'));
        } finally {
            setBusyId(null);
        }
    }

    async function revokeAccess(access: DocumentCollaboratorAccess) {
        setBusyId(`${access.id}:revoke`);
        try {
            await revokeDocumentAccess(documentId, access.id);
            await loadAccessList();
            onActivityRecorded();
            toast.success('Access removed.');
        } catch (revokeError: unknown) {
            toast.error(extractApiError(revokeError, 'Unable to revoke access.'));
        } finally {
            setBusyId(null);
            setConfirmRevokeId(null);
        }
    }

    if (loading) return <SkeletonLoader />;

    if (error) {
        return (
            <div className="share-dialog__access-error">
                <p>{error}</p>
                <button type="button" onClick={() => void loadAccessList()}>Try again</button>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <p className="share-dialog__idle">
                No one else has access yet. Invite a verified user to share this document.
            </p>
        );
    }

    return (
        <div className="share-dialog__access-list">
            {items.map((access) => {
                const status     = getAccessStatus(access);
                const draft      = drafts[access.id] ?? access.permissions;
                const hasChanges = !permissionSetsMatch(draft, access.permissions);
                const isSelf     = currentUser?.userId === access.userId;
                const isAccepted = access.invitationStatus === 'ACCEPTED' && access.isActive;
                const isRevoked  = access.invitationStatus === 'REVOKED';
                const isProtectedManager = !canGrantManageAccess && access.permissions.includes('MANAGE_ACCESS');
                const disabled = Boolean(busyId) || isRevoked || isSelf || isProtectedManager;

                return (
                    <article key={access.id} className="share-dialog__access-card">
                        {/* ── Inline revoke confirm overlay ── */}
                        {confirmRevokeId === access.id && (
                            <div className="share-confirm" role="alertdialog" aria-label="Confirm revoke">
                                <p className="share-confirm__text">Remove access for {access.user.displayName}?</p>
                                <p className="share-confirm__sub">
                                    They will immediately lose the ability to open this document.
                                </p>
                                <div className="share-confirm__actions">
                                    <button
                                        type="button"
                                        className="share-confirm__no"
                                        onClick={() => setConfirmRevokeId(null)}
                                        disabled={busyId === `${access.id}:revoke`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="share-confirm__yes"
                                        onClick={() => void revokeAccess(access)}
                                        disabled={busyId === `${access.id}:revoke`}
                                    >
                                        {busyId === `${access.id}:revoke` ? 'Removing…' : 'Remove'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Card top: avatar + user + status ── */}
                        <div className="share-dialog__access-card-top">
                            <div className="share-dialog__avatar" aria-hidden="true">
                                {access.user.imageUrl
                                    ? <img src={access.user.imageUrl} alt="" className="share-dialog__avatar-img" />
                                    : <span className="share-dialog__avatar-initials">{getAccessInitials(access)}</span>
                                }
                            </div>
                            <div className="share-dialog__access-user">
                                <p className="share-dialog__access-name">{access.user.displayName}</p>
                                <p className="share-dialog__access-email">{access.user.email}</p>
                            </div>
                            <span className={`share-dialog__access-status share-dialog__access-status--${status.tone}`}>
                                {status.label}
                            </span>
                        </div>

                        <p className="share-dialog__access-detail">{status.detail}</p>
                        {access.note && <p className="share-dialog__access-note">"{access.note}"</p>}

                        {/* ── Permission toggles ── */}
                        <div
                            className="share-dialog__access-permissions"
                            aria-label={`Permissions for ${access.user.email}`}
                        >
                            {permissionOptions.map((option) => (
                                <label
                                    key={option.value}
                                    className={[
                                        'share-dialog__access-permission',
                                        draft.includes(option.value) ? 'share-dialog__access-permission--checked' : '',
                                        disabled ? 'share-dialog__access-permission--disabled' : '',
                                    ].filter(Boolean).join(' ')}
                                >
                                    <input
                                        type="checkbox"
                                        checked={draft.includes(option.value)}
                                        disabled={disabled}
                                        onChange={() => setDrafts((current) => ({
                                            ...current,
                                            [access.id]: togglePermission(draft, option.value),
                                        }))}
                                    />
                                    <span>{option.label}</span>
                                </label>
                            ))}
                        </div>

                        {(isSelf || isProtectedManager) && (
                            <p className="share-dialog__access-warning">
                                {isSelf
                                    ? 'You cannot change or remove your own access.'
                                    : 'Only the owner can modify another access manager.'}
                            </p>
                        )}

                        {/* ── Actions ── */}
                        <div className="share-dialog__access-actions">
                            <button
                                type="button"
                                className="share-dialog__secondary-btn"
                                disabled={disabled || !hasChanges || busyId === `${access.id}:save`}
                                onClick={() => void saveAccess(access)}
                            >
                                {busyId === `${access.id}:save` ? 'Saving…' : 'Save changes'}
                            </button>

                            {!isAccepted && (
                                <button
                                    type="button"
                                    className="share-dialog__secondary-btn"
                                    disabled={Boolean(busyId) || isSelf || isProtectedManager}
                                    onClick={() => void resendAccess(access)}
                                >
                                    {busyId === `${access.id}:resend` ? 'Sending…' : 'Resend invite'}
                                </button>
                            )}

                            {!isRevoked && (
                                <button
                                    type="button"
                                    className="share-dialog__danger-btn"
                                    disabled={Boolean(busyId) || isSelf || isProtectedManager}
                                    onClick={() => setConfirmRevokeId(access.id)}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
