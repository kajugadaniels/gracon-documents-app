'use client';

/**
 * InvitationVerificationPanel
 *
 * Two-step verification gate for document invitation access.
 * Step 1 — email OTP: confirm ownership of the invited email address.
 * Step 2 — identity: complete a fresh ID and face challenge in the main app.
 *
 * A visual step progress indicator shows which gate the user is currently on.
 */

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

/** Extracts a human-readable message from a structured API error. */
function getApiMessage(error: unknown, fallback: string): string {
    const axiosError = error as AxiosError<{
        message?: string | { message?: string };
        error?: string;
    }>;
    const payload = axiosError.response?.data?.message;
    if (typeof payload === 'string' && payload.trim()) return payload;
    if (payload && typeof payload === 'object' && typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message;
    }
    const fallbackMsg = axiosError.response?.data?.error;
    return typeof fallbackMsg === 'string' && fallbackMsg.trim() ? fallbackMsg : fallback;
}

/** Formats a datetime string for display, e.g. "14 Jan · 10:30". */
function formatDate(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        }).format(new Date(value));
    } catch {
        return value;
    }
}

// ─── Step indicator ───────────────────────────────────────────────────────────

/** A single numbered circle in the step progress track. */
function StepBubble({ n, active, done }: { n: number; active: boolean; done: boolean }) {
    const filled = active || done;
    return (
        <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700,
            background:  filled ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
            color:       filled ? 'white'                : 'var(--color-text-muted)',
            border: `2px solid ${filled ? 'var(--color-primary)' : 'var(--color-border)'}`,
            boxShadow:   active ? '0 0 0 4px var(--color-primary-subtle)' : 'none',
            transition: 'all 0.25s',
        }}>
            {done ? '✓' : n}
        </div>
    );
}

/** Horizontal two-step progress track. */
function StepIndicator({ currentStep }: { currentStep: 1 | 2 }) {
    const step1Done = currentStep > 1;

    return (
        <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <StepBubble n={1} active={currentStep === 1} done={step1Done} />
                <div style={{
                    flex: 1, height: 2, margin: '0 8px',
                    background: step1Done ? 'var(--color-primary)' : 'var(--color-border)',
                    borderRadius: 2,
                    transition: 'background 0.3s',
                }} />
                <StepBubble n={2} active={currentStep === 2} done={false} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{
                    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em',
                    color: currentStep === 1 ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}>
                    Email OTP
                </span>
                <span style={{
                    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em',
                    color: currentStep === 2 ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}>
                    Identity
                </span>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Guides the invited user through email OTP (step 1) and identity
 * verification (step 2) before the invitation review page is unlocked.
 */
export function InvitationVerificationPanel({
    token, gateStatus, onStatusChange, onError,
}: InvitationVerificationPanelProps) {
    const [email,      setEmail]      = useState(gateStatus.recipient?.email ?? '');
    const [code,       setCode]       = useState('');
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
            onError(getApiMessage(error, 'Unable to send the verification code right now.'));
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
            onError(getApiMessage(error, 'Unable to verify the code right now.'));
        } finally {
            setSubmitting(null);
        }
    }

    const currentStep: 1 | 2 = gateStatus.nextStep === 'identity_verification' ? 2 : 1;

    return (
        <div style={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            padding: '22px',
        }}>
            <StepIndicator currentStep={currentStep} />

            {gateStatus.nextStep === 'identity_verification' ? (
                // ── Step 2: Identity verification ──────────────────────────────
                <div style={{ display: 'grid', gap: 14 }}>
                    <div>
                        <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            Identity verification required
                        </p>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
                            Your email has been confirmed. Complete a fresh ID and face
                            verification challenge in the main app to unlock the review.
                        </p>
                    </div>
                    {gateStatus.identityVerification?.challengeStartedAt && (
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                            Challenge started {formatDate(gateStatus.identityVerification.challengeStartedAt)}.
                        </p>
                    )}
                    <div>
                        <a href={verifyIdentityHref} style={{ textDecoration: 'none' }}>
                            <Button>Start identity challenge</Button>
                        </a>
                    </div>
                </div>
            ) : (
                // ── Step 1: Email OTP ──────────────────────────────────────────
                <div style={{ display: 'grid', gap: 16 }}>
                    <div>
                        <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            Verify the invited email
                        </p>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
                            Enter the invited email address, request a 6-digit code, then
                            confirm it below before moving to identity verification.
                        </p>
                    </div>

                    <Input
                        label="Invited email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                        <Button
                            onClick={() => { void handleSendCode(); }}
                            loading={submitting === 'send'}
                            loadingText="Sending..."
                        >
                            Send verification code
                        </Button>
                        {gateStatus.emailOtp?.sentAt && (
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                                Sent {formatDate(gateStatus.emailOtp.sentAt)}
                                {gateStatus.emailOtp.expiresAt
                                    ? ` · Expires ${formatDate(gateStatus.emailOtp.expiresAt)}`
                                    : ''}
                            </p>
                        )}
                    </div>

                    <Input
                        label="6-digit code"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="000000"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                        <Button
                            onClick={() => { void handleVerifyCode(); }}
                            loading={submitting === 'verify'}
                            loadingText="Verifying..."
                            disabled={code.trim().length !== 6}
                        >
                            Verify code
                        </Button>
                        {gateStatus.emailOtp?.resendAvailableAt && (
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                                Another code available after {formatDate(gateStatus.emailOtp.resendAvailableAt)}.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
