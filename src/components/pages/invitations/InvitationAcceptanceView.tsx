'use client';

/**
 * Public invitation review surface for the documents workspace.
 *
 * The page starts with a safe preview that does not reveal the document title.
 * Once the invited verified user is authenticated, it upgrades to a full
 * review state and allows accepting or declining the invitation.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Card, Button, PremiumLoader } from '@/components/ui';
import {
    acceptInvitation,
    declineInvitation,
    getInvitationGateStatus,
    getInvitationPreview,
    getInvitationReview,
    type InvitationGateStatus,
    type InvitationPreview,
    type InvitationReview,
} from '@/api/invitations.api';
import { getAccessToken } from '@/lib/session';
import { InvitationVerificationPanel } from './InvitationVerificationPanel';

type Props = {
    token: string;
};

function formatDate(value: string | null) {
    if (!value) return 'No expiry set';

    try {
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    } catch {
        return value;
    }
}

function formatPermissions(permissions: string[]) {
    return permissions
        .map((permission) => permission.replaceAll('_', ' ').toLowerCase())
        .join(', ');
}

function getApiMessage(error: unknown, fallback: string) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    const message =
        axiosError.response?.data?.message ?? axiosError.response?.data?.error;

    return typeof message === 'string' && message.trim() ? message : fallback;
}

export function InvitationAcceptanceView({ token }: Props) {
    const router = useRouter();
    const [preview, setPreview] = useState<InvitationPreview | null>(null);
    const [review, setReview] = useState<InvitationReview | null>(null);
    const [gateStatus, setGateStatus] = useState<InvitationGateStatus | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(true);
    const [loadingGate, setLoadingGate] = useState(false);
    const [loadingReview, setLoadingReview] = useState(false);
    const [submitting, setSubmitting] = useState<'accept' | 'decline' | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [gateError, setGateError] = useState<string | null>(null);
    const [reviewError, setReviewError] = useState<string | null>(null);

    const hasSession = useMemo(() => Boolean(getAccessToken()), []);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoadingPreview(true);
            setPageError(null);

            try {
                const previewData = await getInvitationPreview(token);
                if (cancelled) return;

                setPreview(previewData);
            } catch (error) {
                if (cancelled) return;
                setPageError(
                    getApiMessage(
                        error,
                        'This invitation is invalid, expired, or no longer available.',
                    ),
                );
            } finally {
                if (!cancelled) {
                    setLoadingPreview(false);
                }
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, [token]);

    useEffect(() => {
        if (!hasSession) {
            setGateStatus(null);
            setGateError(null);
            return;
        }

        let cancelled = false;

        async function loadGate() {
            setLoadingGate(true);
            setGateError(null);

            try {
                const nextGateStatus = await getInvitationGateStatus(token);
                if (cancelled) return;

                setGateStatus(nextGateStatus);
            } catch (error) {
                if (cancelled) return;
                setGateError(
                    getApiMessage(
                        error,
                        'Sign in with the invited verified account to review this invitation.',
                    ),
                );
            } finally {
                if (!cancelled) setLoadingGate(false);
            }
        }

        void loadGate();

        return () => {
            cancelled = true;
        };
    }, [hasSession, token]);

    useEffect(() => {
        if (!hasSession || gateStatus?.nextStep !== 'review') {
            setReview(null);
            if (gateStatus?.nextStep !== 'review') {
                setLoadingReview(false);
            }
            return;
        }

        let cancelled = false;

        async function loadReview() {
            setLoadingReview(true);
            setReviewError(null);

            try {
                const reviewData = await getInvitationReview(token);
                if (cancelled) return;

                setReview(reviewData);
            } catch (error) {
                if (cancelled) return;
                setReviewError(
                    getApiMessage(
                        error,
                        'Unable to open the invitation review right now.',
                    ),
                );
            } finally {
                if (!cancelled) {
                    setLoadingReview(false);
                }
            }
        }

        void loadReview();

        return () => {
            cancelled = true;
        };
    }, [gateStatus?.nextStep, hasSession, token]);

    async function handleAccept() {
        setSubmitting('accept');
        setReviewError(null);

        try {
            const response = await acceptInvitation(token);
            router.replace(`/documents/${response.document.id}/edit`);
        } catch (error) {
            setReviewError(
                getApiMessage(
                    error,
                    'Unable to accept this invitation right now.',
                ),
            );
        } finally {
            setSubmitting(null);
        }
    }

    async function handleDecline() {
        setSubmitting('decline');
        setReviewError(null);

        try {
            await declineInvitation(token);
            router.replace('/documents');
        } catch (error) {
            setReviewError(
                getApiMessage(
                    error,
                    'Unable to decline this invitation right now.',
                ),
            );
        } finally {
            setSubmitting(null);
        }
    }

    const loginHref = `/login?next=${encodeURIComponent(`/invitations/${token}`)}`;

    return (
        <div
            style={{
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                background:
                    'radial-gradient(circle at top, rgba(102,87,193,0.10), transparent 42%), #f7f5fb',
            }}
        >
            <Card strength="strong" style={{ width: '100%', maxWidth: 620 }}>
                <div style={{ padding: '8px 0' }}>
                    <div style={{ marginBottom: 24 }}>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                borderRadius: 999,
                                padding: '6px 12px',
                                background: 'rgba(91,35,255,0.08)',
                                color: 'var(--color-primary)',
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                            }}
                        >
                            Invitation Review
                        </div>
                        <h1
                            style={{
                                margin: '16px 0 8px',
                                fontSize: 28,
                                lineHeight: 1.15,
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            Review shared document access
                        </h1>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 14,
                                lineHeight: 1.7,
                                color: 'var(--color-text-secondary)',
                            }}
                        >
                            The document title stays hidden until the invited verified
                            account passes the invitation verification steps.
                        </p>
                    </div>

                    {loadingPreview ? (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '18px 0',
                                color: 'var(--color-text-secondary)',
                            }}
                        >
                            <PremiumLoader color="primary" />
                            <span>Loading invitation…</span>
                        </div>
                    ) : pageError ? (
                        <div
                            role="alert"
                            style={{
                                borderRadius: 16,
                                border: '1px solid rgba(199, 77, 77, 0.2)',
                                background: 'rgba(255, 240, 240, 0.9)',
                                padding: '16px 18px',
                                color: '#8f2d2d',
                                fontSize: 14,
                                lineHeight: 1.6,
                            }}
                        >
                            {pageError}
                        </div>
                    ) : preview ? (
                        <>
                            <div
                                style={{
                                    display: 'grid',
                                    gap: 16,
                                    borderRadius: 20,
                                    padding: 20,
                                    background: '#fbfaff',
                                    border: '1px solid rgba(22,16,58,0.08)',
                                }}
                            >
                                <div>
                                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                                        Shared by
                                    </p>
                                    <p
                                        style={{
                                            margin: '6px 0 0',
                                            fontSize: 16,
                                            fontWeight: 700,
                                            color: 'var(--color-text-primary)',
                                        }}
                                    >
                                        {preview.sender.displayName}
                                    </p>
                                </div>

                                <div
                                    style={{
                                        display: 'grid',
                                        gap: 14,
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                    }}
                                >
                                    <div>
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                                            Access requested for
                                        </p>
                                        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-primary)' }}>
                                            {preview.recipient.maskedEmail}
                                        </p>
                                    </div>

                                    <div>
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                                            Permissions
                                        </p>
                                        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-primary)' }}>
                                            {formatPermissions(preview.invitation.permissions)}
                                        </p>
                                    </div>

                                    <div>
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                                            Expires
                                        </p>
                                        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-primary)' }}>
                                            {formatDate(preview.invitation.expiresAt)}
                                        </p>
                                    </div>

                                    <div>
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                                            Invited
                                        </p>
                                        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-primary)' }}>
                                            {formatDate(preview.invitation.invitedAt)}
                                        </p>
                                    </div>
                                </div>

                                {preview.invitation.note && (
                                    <div
                                        style={{
                                            borderRadius: 16,
                                            padding: 16,
                                            background: 'rgba(91,35,255,0.05)',
                                        }}
                                    >
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                                            Sender note
                                        </p>
                                        <p
                                            style={{
                                                margin: '8px 0 0',
                                                fontSize: 14,
                                                lineHeight: 1.7,
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            {preview.invitation.note}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {!hasSession ? (
                                <div
                                    style={{
                                        marginTop: 24,
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 12,
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: 13,
                                            lineHeight: 1.7,
                                            color: 'var(--color-text-secondary)',
                                            maxWidth: 360,
                                        }}
                                        >
                                        Sign in with the invited account to start email verification, then complete identity verification before reviewing this invitation.
                                    </p>
                                    <a href={loginHref} style={{ textDecoration: 'none' }}>
                                        <Button>Sign in to continue</Button>
                                    </a>
                                </div>
                            ) : (
                                <div style={{ marginTop: 24 }}>
                                    {loadingGate ? (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                color: 'var(--color-text-secondary)',
                                            }}
                                        >
                                            <PremiumLoader color="primary" />
                                            <span>Checking invitation access…</span>
                                        </div>
                                    ) : gateError ? (
                                        <div
                                            role="alert"
                                            style={{
                                                borderRadius: 16,
                                                border: '1px solid rgba(199, 77, 77, 0.2)',
                                                background: 'rgba(255, 240, 240, 0.9)',
                                                padding: '14px 16px',
                                                color: '#8f2d2d',
                                                fontSize: 13,
                                                lineHeight: 1.6,
                                            }}
                                        >
                                            {gateError}
                                        </div>
                                    ) : gateStatus && gateStatus.nextStep !== 'review' ? (
                                        <>
                                            {reviewError && (
                                                <div
                                                    role="alert"
                                                    style={{
                                                        marginBottom: 16,
                                                        borderRadius: 16,
                                                        border: '1px solid rgba(199, 77, 77, 0.2)',
                                                        background: 'rgba(255, 240, 240, 0.9)',
                                                        padding: '14px 16px',
                                                        color: '#8f2d2d',
                                                        fontSize: 13,
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    {reviewError}
                                                </div>
                                            )}
                                            <InvitationVerificationPanel
                                                token={token}
                                                gateStatus={gateStatus}
                                                onStatusChange={(nextStatus) => {
                                                    setGateStatus(nextStatus);
                                                    setReview(null);
                                                    setGateError(null);
                                                    setReviewError(null);
                                                }}
                                                onError={setReviewError}
                                            />
                                        </>
                                    ) : loadingReview ? (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                color: 'var(--color-text-secondary)',
                                            }}
                                        >
                                            <PremiumLoader color="primary" />
                                            <span>Opening secure invitation review…</span>
                                        </div>
                                    ) : review ? (
                                        <>
                                            <div
                                                style={{
                                                    borderRadius: 18,
                                                    border: '1px solid rgba(22,16,58,0.08)',
                                                    padding: 18,
                                                    background: '#ffffff',
                                                    marginBottom: 16,
                                                }}
                                            >
                                                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                                                    Document
                                                </p>
                                                <p
                                                    style={{
                                                        margin: '8px 0 0',
                                                        fontSize: 18,
                                                        fontWeight: 700,
                                                        color: 'var(--color-text-primary)',
                                                    }}
                                                >
                                                    {review.document.title}
                                                </p>
                                            </div>

                                            {reviewError && (
                                                <div
                                                    role="alert"
                                                    style={{
                                                        marginBottom: 16,
                                                        borderRadius: 16,
                                                        border: '1px solid rgba(199, 77, 77, 0.2)',
                                                        background: 'rgba(255, 240, 240, 0.9)',
                                                        padding: '14px 16px',
                                                        color: '#8f2d2d',
                                                        fontSize: 13,
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    {reviewError}
                                                </div>
                                            )}

                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: 12,
                                                    justifyContent: 'flex-end',
                                                }}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    onClick={handleDecline}
                                                    loading={submitting === 'decline'}
                                                    loadingText="Declining..."
                                                >
                                                    Decline
                                                </Button>
                                                <Button
                                                    onClick={handleAccept}
                                                    loading={submitting === 'accept'}
                                                    loadingText="Accepting..."
                                                >
                                                    Accept invitation
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div
                                            style={{
                                                borderRadius: 16,
                                                border: '1px solid rgba(240, 178, 30, 0.22)',
                                                background: 'rgba(255, 248, 230, 0.95)',
                                                padding: '16px 18px',
                                                color: '#7d5c10',
                                                fontSize: 13,
                                                lineHeight: 1.7,
                                            }}
                                        >
                                            {reviewError ?? 'Unable to open the invitation review right now.'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </Card>
        </div>
    );
}
