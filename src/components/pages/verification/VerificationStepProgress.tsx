/**
 * Renders the static progress indicator for the documents verification flow.
 */

import type { VerifyStep } from './use-verification-flow';

const STEPS: { key: VerifyStep; label: string }[] = [
    { key: 'nid', label: 'Confirm ID' },
    { key: 'id-card', label: 'ID Card' },
    { key: 'selfie', label: 'Selfie' },
    { key: 'result', label: 'Result' },
];

type VerificationStepProgressProps = {
    current: VerifyStep;
};

/**
 * Shows the current verification step and completed progress.
 */
export function VerificationStepProgress({
    current,
}: VerificationStepProgressProps) {
    const currentIndex = STEPS.findIndex((step) => step.key === current);

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                marginBottom: 32,
                width: '100%',
            }}
        >
            {STEPS.map((step, index) => {
                const isDone = index < currentIndex;
                const isActive = index === currentIndex;
                const isLast = index === STEPS.length - 1;

                return (
                    <div
                        key={step.key}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            flex: isLast ? 0 : 1,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <div
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    background: isDone
                                        ? 'var(--color-success)'
                                        : isActive
                                          ? 'var(--color-primary)'
                                          : 'rgba(255,255,255,0.08)',
                                    border: isActive
                                        ? '2px solid var(--color-primary)'
                                        : isDone
                                          ? '2px solid var(--color-success)'
                                          : '2px solid rgba(255,255,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color:
                                        isDone || isActive
                                            ? '#fff'
                                            : 'var(--color-text-muted)',
                                    transition: 'all 300ms ease',
                                    flexShrink: 0,
                                }}
                            >
                                {isDone ? '✓' : index + 1}
                            </div>
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: 500,
                                    color: isActive
                                        ? 'var(--color-text-primary)'
                                        : isDone
                                          ? 'var(--color-success)'
                                          : 'var(--color-text-muted)',
                                    whiteSpace: 'nowrap',
                                    transition: 'color 300ms ease',
                                }}
                            >
                                {step.label}
                            </span>
                        </div>

                        {!isLast && (
                            <div
                                style={{
                                    flex: 1,
                                    height: 2,
                                    marginBottom: 18,
                                    background: isDone
                                        ? 'var(--color-success)'
                                        : 'rgba(255,255,255,0.08)',
                                    transition: 'background 300ms ease',
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
