/**
 * InvitationReviewPanel
 *
 * Shown when the invited user has cleared all verification gates.
 * Displays the unlocked document title, the completed verification
 * proof chain, and the Accept / Decline action buttons.
 */

import type { InvitationReview } from '@/api/invitations.api';
import { Button } from '@/components/ui';

interface Props {
    review: InvitationReview;
    acceptedState: { documentId: string; acceptedAt: string } | null;
    submitting: 'accept' | 'decline' | null;
    reviewError: string | null;
    onAccept: () => void;
    onDecline: () => void;
}

/** Formats a datetime string to "14 Jan · 10:30" or "Recorded". */
function formatDate(value: string | null | undefined): string {
    if (!value) return 'Recorded';
    try {
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        }).format(new Date(value));
    } catch {
        return value;
    }
}

/** Truncates a long verification attempt ID for display. */
function formatAttemptId(value: string | null): string {
    if (!value) return 'Recorded';
    return value.length > 10 ? `${value.slice(0, 8)}…` : value;
}

/** A single row in the verification proof chain with a green check indicator. */
function CheckItem({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: 'var(--color-success-subtle)',
                border: '1.5px solid var(--color-success-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: 'var(--color-success)',
            }}>
                ✓
            </div>
            <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>
                    {label}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {value}
                </p>
            </div>
        </div>
    );
}

/**
 * Full review surface: document title reveal, verification proof chain,
 * and Accept / Decline controls. Shows an accepted banner on success.
 */
export function InvitationReviewPanel({
    review, acceptedState, submitting, reviewError, onAccept, onDecline,
}: Props) {
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            {/* Success banner — shown after acceptance */}
            {acceptedState && (
                <div style={{
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-success-border)',
                    background: 'var(--color-success-subtle)',
                    padding: '20px 22px',
                }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-success)' }}>
                        Invitation accepted
                    </p>
                    <p style={{ margin: '6px 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--color-success)' }}>
                        Access granted
                    </p>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                        Redirecting you to the document workspace…
                    </p>
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                        Accepted {formatDate(acceptedState.acceptedAt)}
                    </p>
                </div>
            )}

            {/* Unlocked document title */}
            <div style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-elevated)',
                padding: '18px 20px',
            }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>
                    Document
                </p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.25 }}>
                    {review.document.title}
                </p>
            </div>

            {/* Verification proof chain */}
            <div style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-success-border)',
                background: 'var(--color-success-subtle)',
                padding: '18px 20px',
                display: 'grid', gap: 14,
            }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-success)' }}>
                    Verification complete
                </p>
                <CheckItem
                    label="Email OTP passed"
                    value={formatDate(review.verification.emailOtpVerifiedAt)}
                />
                <CheckItem
                    label="Identity challenge started"
                    value={formatDate(review.verification.identityChallengeStartedAt)}
                />
                <CheckItem
                    label="Identity verified"
                    value={formatDate(review.verification.identityVerifiedAt)}
                />
                <CheckItem
                    label="Attempt reference"
                    value={formatAttemptId(review.verification.identityVerificationAttemptId)}
                />
            </div>

            {/* Error feedback */}
            {reviewError && (
                <div role="alert" style={{
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-error-border)',
                    background: 'var(--color-error-subtle)',
                    padding: '14px 16px',
                    color: 'var(--color-error)',
                    fontSize: 13, lineHeight: 1.6,
                }}>
                    {reviewError}
                </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
                <Button
                    variant="ghost"
                    onClick={onDecline}
                    loading={submitting === 'decline'}
                    loadingText="Declining..."
                    disabled={Boolean(acceptedState)}
                >
                    Decline
                </Button>
                <Button
                    onClick={onAccept}
                    loading={submitting === 'accept'}
                    loadingText="Accepting..."
                    disabled={Boolean(acceptedState)}
                >
                    Accept invitation
                </Button>
            </div>
        </div>
    );
}
