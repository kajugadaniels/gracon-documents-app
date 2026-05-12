/**
 * DocumentSigningProgressPanel
 *
 * Shows owners and access managers the required signing progress for a
 * finalised document, including safe reminder actions for pending signers.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    resendDocumentInvitation,
    sendSignatureReminder,
    type DocumentCollaboratorAccess,
    type DocumentDetail,
    type DocumentSignatureRequestSummary,
} from '@/api/documents.api';
import { toast } from '@/components/ui';
import {
    REMINDER_CLOCK_TICK_MS,
    formatRemainingTime,
    formatReminderTime,
    getApiErrorMessage,
    getReminderCooldownFromSentAt,
    getReminderRetryAt,
    isFutureTimestamp,
} from '@/store/editor/signature-reminder-cooldown';

interface DocumentSigningProgressPanelProps {
    document: DocumentDetail;
    currentUserId: string | null;
    canManageAccess: boolean;
    onOpenSigning: () => void;
    onActivityRecorded: () => void;
    onDocumentRefresh: () => void;
}

function formatDate(value: string | null): string {
    if (!value) return 'Not completed';
    return new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function getInitials(name: string, email: string): string {
    const parts = name.split(' ').filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]).join('');
    return (initials || email[0] || 'S').toUpperCase();
}

function isAcceptedCollaborator(access: DocumentCollaboratorAccess | null) {
    return Boolean(
        access &&
        access.isActive &&
        access.acceptedAt &&
        access.invitationStatus === 'ACCEPTED',
    );
}

function getSignerProfile(
    request: DocumentSignatureRequestSummary,
    collaborator: DocumentCollaboratorAccess | null,
    currentUserId: string | null,
) {
    const profile = request.requestedUser;
    const displayName =
        profile?.displayName ??
        collaborator?.user.displayName ??
        (request.requestedUserId === currentUserId ? 'You' : 'Required signer');
    const email =
        profile?.email ??
        collaborator?.user.email ??
        (request.requestedUserId === currentUserId ? 'Your account' : 'Verified user');

    return {
        displayName,
        email,
    };
}

/** Renders signing progress and reminder actions for access managers. */
export function DocumentSigningProgressPanel({
    document,
    currentUserId,
    canManageAccess,
    onOpenSigning,
    onActivityRecorded,
    onDocumentRefresh,
}: DocumentSigningProgressPanelProps) {
    const [busyId, setBusyId] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [reminderCooldowns, setReminderCooldowns] = useState<Record<string, string>>({});
    const collaboratorByUserId = useMemo(
        () => new Map(document.collaborators.map((access) => [access.userId, access])),
        [document.collaborators],
    );

    useEffect(() => {
        setReminderCooldowns((current) => {
            const next = { ...current };

            for (const request of document.signatureRequests) {
                if (isFutureTimestamp(request.nextReminderAvailableAt, Date.now())) {
                    next[request.id] = request.nextReminderAvailableAt;
                }
            }

            return next;
        });
    }, [document.signatureRequests]);

    useEffect(() => {
        const hasActiveCooldown = Object.values(reminderCooldowns).some((value) =>
            isFutureTimestamp(value, Date.now()),
        );

        if (!hasActiveCooldown) {
            return;
        }

        const intervalId = window.setInterval(() => {
            setNow(Date.now());
        }, REMINDER_CLOCK_TICK_MS);

        return () => window.clearInterval(intervalId);
    }, [reminderCooldowns]);

    if (
        !canManageAccess ||
        document.signatureRequests.length === 0 ||
        (document.status !== 'FINALISED' &&
            document.status !== 'SIGNED' &&
            document.status !== 'LOCKED')
    ) {
        return null;
    }

    const signedCount = document.signatureRequests.filter(
        (request) => request.status === 'SIGNED',
    ).length;
    const totalCount = document.signatureRequests.length;
    const pendingCount = totalCount - signedCount;
    const progress = Math.round((signedCount / totalCount) * 100);
    const isOwner = document.access?.isOwner ?? true;

    async function handleReminder(request: DocumentSignatureRequestSummary) {
        setBusyId(`${request.id}:remind`);
        try {
            const response = await sendSignatureReminder(document.id, request.id);
            const nextReminderAt =
                response.nextReminderAvailableAt ??
                getReminderCooldownFromSentAt(response.sentAt);

            setReminderCooldowns((current) => ({
                ...current,
                [request.id]: nextReminderAt,
            }));
            setNow(Date.now());
            onActivityRecorded();
            toast.success('Signature reminder sent.', {
                description: `You can send another after ${formatReminderTime(nextReminderAt)}.`,
            });
        } catch (error: unknown) {
            const retryAt = getReminderRetryAt(error);

            if (retryAt) {
                setReminderCooldowns((current) => ({
                    ...current,
                    [request.id]: retryAt,
                }));
                setNow(Date.now());
                toast.warning('Reminder is cooling down.', {
                    description: `Try again in ${formatRemainingTime(retryAt, Date.now())}.`,
                });
                return;
            }

            onActivityRecorded();
            toast.error(getApiErrorMessage(error, 'Unable to send reminder.'));
        } finally {
            setBusyId(null);
        }
    }

    async function handleResendInvite(access: DocumentCollaboratorAccess) {
        setBusyId(`${access.id}:invite`);
        try {
            const response = await resendDocumentInvitation(document.id, access.id);
            onActivityRecorded();
            toast[response.emailStatus === 'failed' ? 'error' : 'success'](
                response.emailStatus === 'failed'
                    ? 'Invitation refreshed, but email delivery failed.'
                    : 'Invitation email resent.',
            );
            onDocumentRefresh();
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            toast.error(typeof message === 'string' ? message : 'Unable to resend invite.');
        } finally {
            setBusyId(null);
        }
    }

    return (
        <section className="signing-progress" aria-label="Document signing progress">
            <div className="signing-progress__summary">
                <div>
                    <p className="signing-progress__eyebrow">Signing progress</p>
                    <h2 className="signing-progress__title">
                        {pendingCount === 0
                            ? 'All required signatures are complete'
                            : `${pendingCount} signer${pendingCount === 1 ? '' : 's'} remaining`}
                    </h2>
                </div>
                <div className="signing-progress__meter" aria-label={`${progress}% complete`}>
                    <span>{signedCount}/{totalCount}</span>
                    <div className="signing-progress__track">
                        <div style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </div>

            {pendingCount === 0 ? (
                <p className="signing-progress__hint signing-progress__hint--summary">
                    {document.status === 'LOCKED'
                        ? 'This document is locked and immutable.'
                        : isOwner
                            ? 'All required signatures are complete. You can lock the document now.'
                            : 'All required signatures are complete. Waiting for the owner to lock the document.'}
                </p>
            ) : null}

            <div className="signing-progress__list">
                {document.signatureRequests.map((request) => {
                    const collaborator = collaboratorByUserId.get(request.requestedUserId) ?? null;
                    const signer = getSignerProfile(request, collaborator, currentUserId);
                    const isCurrentUser = request.requestedUserId === currentUserId;
                    const isSigned = request.status === 'SIGNED';
                    const canResendInvite = Boolean(
                        collaborator && !isAcceptedCollaborator(collaborator) && !isSigned,
                    );
                    const reminderCooldownUntil =
                        reminderCooldowns[request.id] ?? request.nextReminderAvailableAt ?? null;
                    const isReminderCoolingDown = isFutureTimestamp(reminderCooldownUntil, now);

                    return (
                        <article key={request.id} className="signing-progress__row">
                            <div className="signing-progress__avatar" aria-hidden="true">
                                <span>{getInitials(signer.displayName, signer.email)}</span>
                            </div>
                            <div className="signing-progress__person">
                                <p>{signer.displayName}</p>
                                <span>{signer.email}</span>
                            </div>
                            <div className={`signing-progress__status signing-progress__status--${isSigned ? 'signed' : 'pending'}`}>
                                {isSigned ? `Signed ${formatDate(request.signedAt)}` : 'Pending signature'}
                            </div>
                            <div className="signing-progress__action">
                                {isSigned ? (
                                    <span className="signing-progress__complete">Complete</span>
                                ) : isCurrentUser ? (
                                    <button type="button" onClick={onOpenSigning}>
                                        Sign now
                                    </button>
                                ) : canResendInvite && collaborator ? (
                                    <button
                                        type="button"
                                        onClick={() => void handleResendInvite(collaborator)}
                                        disabled={busyId === `${collaborator.id}:invite`}
                                    >
                                        {busyId === `${collaborator.id}:invite` ? 'Sending...' : 'Resend invite'}
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => void handleReminder(request)}
                                            disabled={
                                                isReminderCoolingDown ||
                                                busyId === `${request.id}:remind`
                                            }
                                            title={
                                                isReminderCoolingDown && reminderCooldownUntil
                                                    ? `Try again after ${formatReminderTime(reminderCooldownUntil)}`
                                                    : undefined
                                            }
                                        >
                                            {busyId === `${request.id}:remind`
                                                ? 'Sending...'
                                                : isReminderCoolingDown && reminderCooldownUntil
                                                    ? `Try in ${formatRemainingTime(reminderCooldownUntil, now)}`
                                                    : 'Send reminder'}
                                        </button>
                                        {isReminderCoolingDown && reminderCooldownUntil ? (
                                            <span className="signing-progress__hint">
                                                Available {formatReminderTime(reminderCooldownUntil)}
                                            </span>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
