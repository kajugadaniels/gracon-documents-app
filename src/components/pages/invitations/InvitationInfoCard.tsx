/**
 * InvitationInfoCard
 *
 * Displays the sender identity, recipient email, permission badges,
 * invitation dates, and optional sender note. Pure display — no actions.
 */

import type { InvitationPreview } from '@/api/invitations.api';

interface Props {
    preview: InvitationPreview;
}

/** Formats a date string to "14 April 2026" or a no-expiry fallback. */
function formatDate(value: string | null): string {
    if (!value) return 'No expiry set';
    try {
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric',
        }).format(new Date(value));
    } catch {
        return value;
    }
}

/** A single labeled metadata row. Accepts either a text value or child content. */
function MetaRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
    return (
        <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                {label}
            </p>
            {value && (
                <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--color-text-primary)' }}>
                    {value}
                </p>
            )}
            {children}
        </div>
    );
}

/** Pill badge for a single document permission level. */
function PermissionChip({ label }: { label: string }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '3px 11px', borderRadius: 999,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
            background: 'var(--color-primary-subtle)',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-border-primary)',
        }}>
            {label}
        </span>
    );
}

/**
 * Shows who sent the invitation, the invited email, permission level,
 * expiry/invite dates, and an optional sender message.
 */
export function InvitationInfoCard({ preview }: Props) {
    const initials = preview.sender.displayName
        .split(' ')
        .map((w) => w[0] ?? '')
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?';

    const permissions = preview.invitation.permissions.map(
        (p) => p.replaceAll('_', ' ')
    );

    return (
        <div style={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            overflow: 'hidden',
        }}>
            {/* Sender highlight row */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '18px 20px',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-primary-subtle)',
            }}>
                <div style={{
                    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--color-primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, letterSpacing: '0.02em',
                    boxShadow: '0 2px 12px var(--color-primary-glow)',
                }}>
                    {initials}
                </div>
                <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
                        Shared by
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {preview.sender.displayName}
                    </p>
                </div>
            </div>

            {/* Metadata grid */}
            <div style={{ padding: '18px 20px', display: 'grid', gap: 16 }}>
                <MetaRow label="Invited account" value={preview.recipient.maskedEmail} />
                <MetaRow label="Permissions">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {permissions.map((p) => (
                            <PermissionChip key={p} label={p} />
                        ))}
                    </div>
                </MetaRow>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                    <MetaRow label="Invited on" value={formatDate(preview.invitation.invitedAt)} />
                    <MetaRow label="Expires" value={formatDate(preview.invitation.expiresAt)} />
                </div>
            </div>

            {/* Optional sender note */}
            {preview.invitation.note && (
                <div style={{
                    margin: '0 20px 20px',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.55)',
                    borderLeft: '3px solid var(--color-primary)',
                }}>
                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
                        Message
                    </p>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-primary)' }}>
                        {preview.invitation.note}
                    </p>
                </div>
            )}
        </div>
    );
}
