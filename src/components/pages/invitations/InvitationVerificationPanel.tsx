'use client';

import { useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { Button, Input } from '@/components/ui';
import {
    requestInvitationEmailOtp,
    verifyInvitationEmailOtp,
    type InvitationGateStatus,
} from '@/api/invitations.api';
import { APP_URL, DOCS_URL } from '@/lib/session';

interface InvitationVerificationPanelProps {
    token: string;
    gateStatus: InvitationGateStatus;
    onStatusChange: (status: InvitationGateStatus) => void;
    onError: (message: string | null) => void;
}

function getApiMessage(error: unknown, fallback: string) {
    const axiosError = error as AxiosError<{
        message?: string | { message?: string };
        error?: string;
    }>;
    const payloadMessage = axiosError.response?.data?.message;

    if (typeof payloadMessage === 'string' && payloadMessage.trim()) {
        return payloadMessage;
    }

    if (
        payloadMessage &&
        typeof payloadMessage === 'object' &&
        typeof payloadMessage.message === 'string' &&
        payloadMessage.message.trim()
    ) {
        return payloadMessage.message;
    }

    const fallbackMessage = axiosError.response?.data?.error;
    return typeof fallbackMessage === 'string' && fallbackMessage.trim()
        ? fallbackMessage
        : fallback;
}

function formatDate(value: string | null | undefined) {
    if (!value) return null;

    try {
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    } catch {
        return value;
    }
}

export function InvitationVerificationPanel({
    token,
    gateStatus,
    onStatusChange,
    onError,
}: InvitationVerificationPanelProps) {
    const [email, setEmail] = useState(gateStatus.recipient?.email ?? '');
    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState<'send' | 'verify' | null>(null);

    const verifyIdentityHref = useMemo(() => {
        const next = `${DOCS_URL}/invitations/${token}`;
        return `${APP_URL}/verify-identity?challenge=invitation&next=${encodeURIComponent(next)}`;
    }, [token]);

    async function handleSendCode() {
        setSubmitting('send');
        onError(null);

        try {
            const nextStatus = await requestInvitationEmailOtp(token, email);
            onStatusChange(nextStatus);
        } catch (error) {
            onError(
                getApiMessage(
                    error,
                    'Unable to send the invitation verification code right now.',
                ),
            );
        } finally {
            setSubmitting(null);
        }
    }

    async function handleVerifyCode() {
        setSubmitting('verify');
        onError(null);

        try {
            const nextStatus = await verifyInvitationEmailOtp(token, code.trim());
            onStatusChange(nextStatus);
        } catch (error) {
            onError(
                getApiMessage(
                    error,
                    'Unable to verify the invitation code right now.',
                ),
            );
        } finally {
            setSubmitting(null);
        }
    }

    if (gateStatus.nextStep === 'identity_verification') {
        return (
            <div
                style={{
                    borderRadius: 18,
                    border: '1px solid rgba(240, 178, 30, 0.22)',
                    background: 'rgba(255, 248, 230, 0.95)',
                    padding: '18px 20px',
                    color: '#7d5c10',
                    display: 'grid',
                    gap: 12,
                }}
            >
                <div>
                    <p style={{ margin: 0, fontSize: 12, color: '#9a7415' }}>
                        Step 2 of 2
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 700 }}>
                        Identity verification required
                    </p>
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
                    Your email has been confirmed for this invitation. Complete a fresh ID and face verification challenge in the main app to unlock the review page.
                </p>
                {gateStatus.identityVerification?.challengeStartedAt && (
                    <p style={{ margin: 0, fontSize: 12, color: '#9a7415' }}>
                        Challenge started {formatDate(gateStatus.identityVerification.challengeStartedAt)}.
                    </p>
                )}
                <div>
                    <a href={verifyIdentityHref} style={{ textDecoration: 'none' }}>
                        <Button variant="ghost">Start identity challenge</Button>
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'grid',
                gap: 16,
                borderRadius: 18,
                border: '1px solid rgba(22,16,58,0.08)',
                padding: 18,
                background: '#ffffff',
            }}
        >
            <div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Step 1 of 2
                </p>
                <p
                    style={{
                        margin: '6px 0 0',
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                    }}
                >
                    Verify the invited email
                </p>
                <p
                    style={{
                        margin: '8px 0 0',
                        fontSize: 13,
                        lineHeight: 1.7,
                        color: 'var(--color-text-secondary)',
                    }}
                >
                    Type the invited account email, request a 6-digit code, then confirm it here before moving to identity verification.
                </p>
            </div>

            <Input
                label="Invited email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <Button
                    onClick={() => {
                        void handleSendCode();
                    }}
                    loading={submitting === 'send'}
                    loadingText="Sending..."
                >
                    Send verification code
                </Button>
                {gateStatus.emailOtp?.sentAt && (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                        Sent {formatDate(gateStatus.emailOtp.sentAt)}
                        {gateStatus.emailOtp.expiresAt ? ` • Expires ${formatDate(gateStatus.emailOtp.expiresAt)}` : ''}
                    </p>
                )}
            </div>

            <Input
                label="6-digit code"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="000000"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <Button
                    onClick={() => {
                        void handleVerifyCode();
                    }}
                    loading={submitting === 'verify'}
                    loadingText="Verifying..."
                    disabled={code.trim().length !== 6}
                >
                    Verify code
                </Button>
                {gateStatus.emailOtp?.resendAvailableAt && (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                        Another code can be requested after {formatDate(gateStatus.emailOtp.resendAvailableAt)}.
                    </p>
                )}
            </div>
        </div>
    );
}
