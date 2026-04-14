/**
 * Renders biometric scoring details for the documents verification result.
 */

import { ScoreRing } from './ScoreRing';

type VerificationBiometricSummaryProps = {
    compositeScore: number;
    faceScore: number;
    livenessScore: number;
    passed: boolean;
};

function ScoreBar({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span
                    style={{
                        fontSize: 13,
                        color: 'var(--color-text-secondary)',
                    }}
                >
                    {label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color }}>
                    {Math.round(value)}%
                </span>
            </div>
            <div
                style={{
                    height: 6,
                    borderRadius: 3,
                    background: 'rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        height: '100%',
                        width: `${value}%`,
                        background: color,
                        borderRadius: 3,
                        transition:
                            'width 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                />
            </div>
        </div>
    );
}

/**
 * Shows composite, face, and liveness verification scores.
 */
export function VerificationBiometricSummary({
    compositeScore,
    faceScore,
    livenessScore,
    passed,
}: VerificationBiometricSummaryProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                    <circle
                        cx="12"
                        cy="8"
                        r="4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                    />
                    <path
                        d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                    />
                </svg>
                Biometric Analysis
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <ScoreRing score={compositeScore} passed={passed} size={100} />
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}
                >
                    <ScoreBar
                        label="Face similarity"
                        value={faceScore}
                        color="#60a5fa"
                    />
                    <ScoreBar
                        label="Liveness"
                        value={livenessScore}
                        color="#a78bfa"
                    />
                </div>
            </div>
        </div>
    );
}
