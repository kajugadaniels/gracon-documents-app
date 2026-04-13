/**
 * ShareDocumentAuditLog
 *
 * Owner-only timeline of document sharing and invitation events. The API
 * returns sanitized metadata only; sensitive network details stay server-side.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    getDocumentAccessAuditLog,
    type DocumentAccessAuditEntry,
    type DocumentAccessAuditEvent,
    type CollaboratorPermission,
} from '@/api/documents.api';

interface ShareDocumentAuditLogProps {
    documentId: string;
    refreshKey: number;
    onCountChange: (count: number) => void;
}

const EVENT_LABELS: Record<DocumentAccessAuditEvent, string> = {
    INVITE_CREATED: 'Invitation created',
    INVITE_EMAIL_QUEUED: 'Email queued',
    INVITE_EMAIL_SENT: 'Email sent',
    INVITE_EMAIL_FAILED: 'Email failed',
    INVITE_OPENED: 'Invitation opened',
    AUTH_REQUIRED: 'Authentication required',
    LOGIN_COMPLETED: 'Login completed',
    IDENTITY_VERIFICATION_REQUIRED: 'Identity verification required',
    IDENTITY_VERIFICATION_PASSED: 'Identity verification passed',
    IDENTITY_VERIFICATION_FAILED: 'Identity verification failed',
    INVITE_ACCEPTED: 'Invitation accepted',
    INVITE_DECLINED: 'Invitation declined',
    INVITE_REVOKED: 'Access revoked',
    PERMISSIONS_UPDATED: 'Permissions updated',
    COMMENT_CREATED: 'Comment added',
    COMMENT_REPLIED: 'Comment replied',
    COMMENT_RESOLVED: 'Comment resolved',
    SIGNATURE_REMINDER_SENT: 'Signature reminder sent',
    SIGNATURE_REMINDER_FAILED: 'Signature reminder failed',
};

function getErrorMessage(error: unknown, fallback: string) {
    const message = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
}

function formatDate(value: string) {
    return new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatPermission(permission: CollaboratorPermission) {
    if (permission === 'MANAGE_ACCESS') return 'Manage access';
    return permission.charAt(0) + permission.slice(1).toLowerCase();
}

function formatPermissions(permissions: CollaboratorPermission[]) {
    const visible = permissions.filter((permission) => permission !== 'READ');
    if (visible.length === 0) return 'Read only';
    const permissionsWithRead: CollaboratorPermission[] = ['READ', ...visible];
    return permissionsWithRead.map(formatPermission).join(', ');
}

function getActorLabel(event: DocumentAccessAuditEntry) {
    if (event.actor) return event.actor.displayName;
    if (event.eventType === 'INVITE_OPENED') return 'Invitation link';
    return 'System';
}

function getEventDescription(event: DocumentAccessAuditEntry) {
    const target = event.target?.displayName ?? 'recipient';
    const actor = event.actor?.displayName ?? 'Someone';
    if (event.eventType === 'PERMISSIONS_UPDATED') {
        return `${target}: ${formatPermissions(event.fromPermissions)} -> ${formatPermissions(event.toPermissions)}`;
    }

    if (event.eventType === 'COMMENT_CREATED') {
        return event.metadata?.anchored
            ? `${actor} added an anchored comment.`
            : `${actor} added a document comment.`;
    }

    if (event.eventType === 'COMMENT_REPLIED') {
        return `${actor} replied to a document comment.`;
    }

    if (event.eventType === 'COMMENT_RESOLVED') {
        return `${actor} resolved a comment from ${target}.`;
    }

    if (event.eventType === 'INVITE_CREATED' && event.metadata?.resent) {
        return `New invitation token issued for ${target}.`;
    }

    if (event.eventType === 'INVITE_CREATED') return `${target} was invited.`;
    if (event.eventType === 'INVITE_REVOKED') return `${target}'s access was removed.`;
    if (event.eventType === 'INVITE_ACCEPTED') return `${target} accepted the invitation.`;
    if (event.eventType === 'INVITE_DECLINED') return `${target} declined the invitation.`;
    if (event.eventType === 'INVITE_OPENED') return `${target} opened the invitation link.`;
    if (event.eventType === 'SIGNATURE_REMINDER_FAILED') return `Signature reminder delivery failed for ${target}.`;
    if (event.eventType === 'SIGNATURE_REMINDER_SENT') return `Signature reminder sent to ${target}.`;
    if (event.eventType === 'INVITE_EMAIL_FAILED') return `Email delivery failed for ${target}.`;
    if (event.eventType === 'INVITE_EMAIL_SENT') return `Invitation email sent to ${target}.`;
    if (event.eventType === 'INVITE_EMAIL_QUEUED') return `Invitation email queued for ${target}.`;
    return target;
}

function getTone(eventType: DocumentAccessAuditEvent) {
    if (
        eventType === 'INVITE_EMAIL_FAILED' ||
        eventType === 'IDENTITY_VERIFICATION_FAILED' ||
        eventType === 'SIGNATURE_REMINDER_FAILED'
    ) return 'danger';
    if (
        eventType === 'INVITE_ACCEPTED' ||
        eventType === 'IDENTITY_VERIFICATION_PASSED' ||
        eventType === 'COMMENT_RESOLVED' ||
        eventType === 'SIGNATURE_REMINDER_SENT'
    ) return 'success';
    if (eventType === 'INVITE_REVOKED' || eventType === 'INVITE_DECLINED') return 'muted';
    return 'default';
}

/** Fetches and renders the document access audit timeline. */
export function ShareDocumentAuditLog({
    documentId,
    refreshKey,
    onCountChange,
}: ShareDocumentAuditLogProps) {
    const [events, setEvents] = useState<DocumentAccessAuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAuditLog = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getDocumentAccessAuditLog(documentId);
            setEvents(response.events);
            onCountChange(response.events.length);
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError, 'Unable to load access activity.'));
        } finally {
            setLoading(false);
        }
    }, [documentId, onCountChange]);

    useEffect(() => {
        void loadAuditLog();
    }, [loadAuditLog, refreshKey]);

    if (loading) {
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

    if (error) {
        return (
            <div className="share-dialog__access-error">
                <p>{error}</p>
                <button type="button" onClick={() => void loadAuditLog()}>Try again</button>
            </div>
        );
    }

    if (events.length === 0) {
        return <p className="share-dialog__idle">No access activity has been recorded yet.</p>;
    }

    return (
        <ol className="share-dialog__audit-list">
            {events.map((event) => (
                <li key={event.id} className="share-dialog__audit-item">
                    <span className={`share-dialog__audit-dot share-dialog__audit-dot--${getTone(event.eventType)}`} />
                    <div className="share-dialog__audit-card">
                        <div className="share-dialog__audit-head">
                            <p className="share-dialog__audit-title">{EVENT_LABELS[event.eventType]}</p>
                            <time className="share-dialog__audit-time" dateTime={event.createdAt}>
                                {formatDate(event.createdAt)}
                            </time>
                        </div>
                        <p className="share-dialog__audit-description">
                            {getEventDescription(event)}
                        </p>
                        <p className="share-dialog__audit-meta">
                            Actor: {getActorLabel(event)}
                        </p>
                    </div>
                </li>
            ))}
        </ol>
    );
}
