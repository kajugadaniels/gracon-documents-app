'use client';

/**
 * Circular score indicator for the verification result.
 */

interface ScoreRingProps {
    score: number;
    size?: number;
    passed: boolean;
}

/**
 * Displays the composite verification score in a ring.
 */
export function ScoreRing({ score, size = 140, passed }: ScoreRingProps) {
    const radius = (size - 16) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const color = passed
        ? 'var(--color-success)'
        : score >= 60
          ? 'var(--color-warning)'
          : 'var(--color-error)';

    return (
        <div
            style={{
                position: 'relative',
                width: size,
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            <svg
                width={size}
                height={size}
                style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(91,35,255,0.10)"
                    strokeWidth={8}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    style={{
                        transition:
                            'stroke-dashoffset 800ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                />
            </svg>

            <div style={{ textAlign: 'center', zIndex: 1 }}>
                <div
                    style={{
                        fontSize: size > 100 ? 26 : 20,
                        fontWeight: 700,
                        color,
                        lineHeight: 1,
                    }}
                >
                    {Math.round(score)}%
                </div>
                <div
                    style={{
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                        marginTop: 4,
                        fontWeight: 500,
                    }}
                >
                    {passed ? 'Passed' : 'Score'}
                </div>
            </div>
        </div>
    );
}
