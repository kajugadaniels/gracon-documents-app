/**
 * Displays the structured identity details returned by the verification service.
 */

import type { VerificationIdInfo } from '@/api/verification/verification-contract';

type VerificationIdentitySummaryProps = {
    idInfo: VerificationIdInfo;
    documentMatch: boolean;
};

function MatchBadge({ matched }: { matched: boolean }) {
    return (
        <span
            style={{
                borderRadius: 999,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                color: matched ? 'var(--color-success)' : 'var(--color-error)',
                background: matched
                    ? 'var(--color-success-subtle)'
                    : 'var(--color-error-subtle)',
                border: `1px solid ${
                    matched
                        ? 'var(--color-success-border)'
                        : 'var(--color-error-border)'
                }`,
            }}
        >
            {matched ? 'Matched' : 'No match'}
        </span>
    );
}

/**
 * Shows verified name, date of birth, and masked document number.
 */
export function VerificationIdentitySummary({
    idInfo,
    documentMatch,
}: VerificationIdentitySummaryProps) {
    return (
        <div
            style={{
                background: 'rgba(91,35,255,0.05)',
                border: '1px solid rgba(91,35,255,0.14)',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
            }}
        >
            <div
                style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <rect
                        x="2"
                        y="5"
                        width="20"
                        height="14"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                    />
                    <path
                        d="M7 9h4M7 13h6M15 13h2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                    />
                    <circle
                        cx="16.5"
                        cy="9.5"
                        r="2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                </svg>
                Identity Details
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 10,
                            color: 'var(--color-text-muted)',
                            marginBottom: 3,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                        }}
                    >
                        Full Name
                    </div>
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                            letterSpacing: '-0.01em',
                        }}
                    >
                        {idInfo.fullName}
                    </div>
                </div>
                <div>
                    <div
                        style={{
                            fontSize: 10,
                            color: 'var(--color-text-muted)',
                            marginBottom: 3,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                        }}
                    >
                        Date of Birth
                    </div>
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                            letterSpacing: '-0.01em',
                        }}
                    >
                        {new Intl.DateTimeFormat('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                        }).format(new Date(idInfo.dateOfBirth))}
                    </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <div
                        style={{
                            fontSize: 10,
                            color: 'var(--color-text-muted)',
                            marginBottom: 3,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                        }}
                    >
                        Document Number
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <span
                            style={{
                                fontSize: 15,
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                letterSpacing: '0.12em',
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            {idInfo.documentNumber.slice(0, 4)}
                            &nbsp;••••&nbsp;••••&nbsp;
                            {idInfo.documentNumber.slice(12)}
                        </span>
                        <MatchBadge matched={documentMatch} />
                    </div>
                </div>
            </div>
        </div>
    );
}
