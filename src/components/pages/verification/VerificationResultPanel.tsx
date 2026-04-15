/**
 * Presents the verification outcome, previews, scores, and next actions.
 */

import {
    VerificationResultPanelContent,
    type VerificationResult,
} from '@gracon/verification-ui';
import { Button } from '@/components/ui';

type VerificationResultPanelProps = {
    result: VerificationResult;
    idCardPreview: string | null;
    selfiePreview: string | null;
    successActionLabel: string;
    retryActionLabel: string;
    dashboardActionLabel: string;
    lockedActionLabel: string;
    onContinue: () => void;
    onRetry: () => void;
    onDashboard: () => void;
};

function ResultStatusBadge({ passed }: { passed: boolean }) {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 999,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                color: passed
                    ? 'var(--color-success)'
                    : 'var(--color-error)',
                background: passed
                    ? 'var(--color-success-subtle)'
                    : 'var(--color-error-subtle)',
                border: `1px solid ${
                    passed
                        ? 'var(--color-success-border)'
                        : 'var(--color-error-border)'
                }`,
            }}
        >
            <span>{passed ? '✓' : '✕'}</span>
            <span>{passed ? 'Identity verified' : 'Verification failed'}</span>
        </span>
    );
}

/**
 * Shows the final verification outcome and the actions available from it.
 */
export function VerificationResultPanel({
    result,
    idCardPreview,
    selfiePreview,
    successActionLabel,
    retryActionLabel,
    dashboardActionLabel,
    lockedActionLabel,
    onContinue,
    onRetry,
    onDashboard,
}: VerificationResultPanelProps) {
    return (
        <VerificationResultPanelContent
            result={result}
            idCardPreview={idCardPreview}
            selfiePreview={selfiePreview}
            actionLabels={{
                successActionLabel,
                retryActionLabel,
                dashboardActionLabel,
                lockedActionLabel,
            }}
            actionHandlers={{ onContinue, onRetry, onDashboard }}
            renderStatusBadge={(passed) => (
                <ResultStatusBadge passed={passed} />
            )}
            renderActions={({ result, labels, handlers }) => (
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                    {result.passed ? (
                        <Button fullWidth size="lg" onClick={handlers.onContinue}>
                            {labels.successActionLabel}
                        </Button>
                    ) : result.attemptsRemaining > 0 ? (
                        <>
                            <Button
                                variant="ghost"
                                style={{ flex: 1 }}
                                onClick={handlers.onRetry}
                            >
                                {labels.retryActionLabel}
                            </Button>
                            <Button
                                style={{ flex: 1 }}
                                onClick={handlers.onDashboard}
                            >
                                {labels.dashboardActionLabel}
                            </Button>
                        </>
                    ) : (
                        <Button
                            fullWidth
                            variant="ghost"
                            onClick={handlers.onDashboard}
                        >
                            {labels.lockedActionLabel}
                        </Button>
                    )}
                </div>
            )}
        />
    );
}
