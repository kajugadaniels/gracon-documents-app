/**
 * ShareDocumentAccessManager
 *
 * Lists current collaborators and pending invitations for a document, then
 * lets an authorized user update permissions, revoke access, or resend an
 * invitation with a fresh single-use token.
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

const PERMISSION_ORDER: CollaboratorPermission[] = ['READ', 'COMMENT', 'SIGN', 'EDIT', 'MANAGE_ACCESS'];
const ACCESS_PERMISSION_OPTIONS: Array<{
    value: Exclude<CollaboratorPermission, 'READ'>;
    label: string;
}> = [
    { value: 'COMMENT', label: 'Comment' }, { value: 'SIGN', label: 'Sign' },
    { value: 'EDIT', label: 'Edit' }, { value: 'MANAGE_ACCESS', label: 'Manage access' },
];
interface ShareDocumentAccessManagerProps {
    documentId: string;
    canGrantManageAccess: boolean;
    refreshKey: number;
    onCountChange: (count: number) => void;
}
function normalizePermissions(permissions: CollaboratorPermission[]) {
    const unique = new Set<CollaboratorPermission>(permissions);
    unique.add('READ');
    return PERMISSION_ORDER.filter((permission) => unique.has(permission));
}
function permissionSetsMatch(left: CollaboratorPermission[], right: CollaboratorPermission[]) {
    return normalizePermissions(left).join('|') === normalizePermissions(right).join('|');
}

function togglePermission(
    permissions: CollaboratorPermission[],
    permission: Exclude<CollaboratorPermission, 'READ'>,
) {
    const normalized = normalizePermissions(permissions);
    if (normalized.includes(permission)) {
        return normalized.filter((value) => value !== permission);
    }
    return normalizePermissions([...normalized, permission]);
}

function formatAccessDate(value: string | null) {
    if (!value) return null;
    return new Date(value).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

function getAccessInitials(access: DocumentCollaboratorAccess) {
    const first = access.user.postNames?.[0] ?? '';
    const last = access.user.surName?.[0] ?? '';
    if (first || last) return `${first}${last}`.toUpperCase();
    return access.user.email[0].toUpperCase();
}

function getAccessStatus(access: DocumentCollaboratorAccess) {
    if (access.invitationStatus === 'ACCEPTED' && access.isActive) {
        return { label: 'Has access', detail: `Accepted ${formatAccessDate(access.acceptedAt) ?? 'recently'}`, tone: 'active' };
    }
    if (access.invitationStatus === 'PENDING') {
        return { label: 'Pending', detail: `Expires ${formatAccessDate(access.invitationExpiresAt) ?? 'soon'}`, tone: 'pending' };
    }
    if (access.invitationStatus === 'DECLINED') {
        return { label: 'Declined', detail: `Declined ${formatAccessDate(access.declinedAt) ?? 'the invitation'}`, tone: 'muted' };
    }
    if (access.invitationStatus === 'REVOKED') {
        return { label: 'Revoked', detail: `Removed ${formatAccessDate(access.revokedAt) ?? 'from access'}`, tone: 'danger' };
    }
    return { label: 'Expired', detail: `Expired ${formatAccessDate(access.invitationExpiresAt) ?? 'recently'}`, tone: 'muted' };
}

function getErrorMessage(error: unknown, fallback: string) {
    const message = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
}

/** Renders the access list and exposes collaborator management actions. */
export function ShareDocumentAccessManager({
    documentId,
    canGrantManageAccess,
    refreshKey,
    onCountChange,
}: ShareDocumentAccessManagerProps) {
    const currentUser = useSessionUser();
    const [items, setItems] = useState<DocumentCollaboratorAccess[]>([]);
    const [drafts, setDrafts] = useState<Record<string, CollaboratorPermission[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const permissionOptions = canGrantManageAccess
        ? ACCESS_PERMISSION_OPTIONS
        : ACCESS_PERMISSION_OPTIONS.filter((option) => option.value !== 'MANAGE_ACCESS');

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
            setError(getErrorMessage(loadError, 'Unable to load people with access.'));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadAccessList();
    }, [documentId, refreshKey]);

    function replaceItem(updated: DocumentCollaboratorAccess) {
        setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
        setDrafts((current) => ({
            ...current,
            [updated.id]: normalizePermissions(updated.permissions),
        }));
    }

    async function saveAccess(access: DocumentCollaboratorAccess) {
        setBusyId(`${access.id}:save`);
        try {
            const updated = await updateDocumentAccess(documentId, access.id, drafts[access.id] ?? access.permissions);
            replaceItem(updated);
            toast.success('Access permissions updated.');
        } catch (saveError: unknown) {
            toast.error(getErrorMessage(saveError, 'Unable to update permissions.'));
        } finally {
            setBusyId(null);
        }
    }

    async function resendAccess(access: DocumentCollaboratorAccess) {
        setBusyId(`${access.id}:resend`);
        try {
            const updated = await resendDocumentInvitation(documentId, access.id);
            replaceItem(updated);
            toast[updated.emailStatus === 'failed' ? 'error' : 'success'](
                updated.emailStatus === 'failed'
                    ? 'Invitation token was refreshed, but email delivery failed.'
                    : 'Invitation email resent.',
            );
        } catch (resendError: unknown) {
            toast.error(getErrorMessage(resendError, 'Unable to resend invitation.'));
        } finally {
            setBusyId(null);
        }
    }

    async function revokeAccess(access: DocumentCollaboratorAccess) {
        if (!window.confirm(`Remove access for ${access.user.email}?`)) return;
        setBusyId(`${access.id}:revoke`);
        try {
            await revokeDocumentAccess(documentId, access.id);
            await loadAccessList();
            toast.success('Access removed.');
        } catch (revokeError: unknown) {
            toast.error(getErrorMessage(revokeError, 'Unable to revoke access.'));
        } finally {
            setBusyId(null);
        }
    }

    if (loading) return <p className="share-dialog__idle">Loading people with access...</p>;

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
                const status = getAccessStatus(access);
                const draft = drafts[access.id] ?? access.permissions;
                const hasChanges = !permissionSetsMatch(draft, access.permissions);
                const isSelf = currentUser?.userId === access.userId;
                const isAccepted = access.invitationStatus === 'ACCEPTED' && access.isActive;
                const isRevoked = access.invitationStatus === 'REVOKED';
                const isProtectedManager =
                    !canGrantManageAccess && access.permissions.includes('MANAGE_ACCESS');
                const disabled = Boolean(busyId) || isRevoked || isSelf || isProtectedManager;

                return (
                    <article key={access.id} className="share-dialog__access-card">
                        <div className="share-dialog__access-card-top">
                            <div className="share-dialog__avatar" aria-hidden="true">
                                {access.user.imageUrl
                                    ? <img src={access.user.imageUrl} alt={getAccessInitials(access)} className="share-dialog__avatar-img" />
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

                        <div className="share-dialog__access-permissions" aria-label={`Permissions for ${access.user.email}`}>
                            {permissionOptions.map((option) => (
                                <label
                                    key={option.value}
                                    className={`share-dialog__access-permission${draft.includes(option.value) ? ' share-dialog__access-permission--checked' : ''}${disabled ? ' share-dialog__access-permission--disabled' : ''}`}
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

                        <div className="share-dialog__access-actions">
                            <button
                                type="button"
                                className="share-dialog__secondary-btn"
                                disabled={disabled || !hasChanges || busyId === `${access.id}:save`}
                                onClick={() => void saveAccess(access)}
                            >
                                {busyId === `${access.id}:save` ? 'Saving...' : 'Save changes'}
                            </button>

                            {!isAccepted && (
                                <button
                                    type="button"
                                    className="share-dialog__secondary-btn"
                                    disabled={Boolean(busyId) || isSelf || isProtectedManager}
                                    onClick={() => void resendAccess(access)}
                                >
                                    {busyId === `${access.id}:resend` ? 'Sending...' : 'Resend invite'}
                                </button>
                            )}

                            {!isRevoked && (
                                <button
                                    type="button"
                                    className="share-dialog__danger-btn"
                                    disabled={Boolean(busyId) || isSelf || isProtectedManager}
                                    onClick={() => void revokeAccess(access)}
                                >
                                    {busyId === `${access.id}:revoke` ? 'Removing...' : 'Remove'}
                                </button>
                            )}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
