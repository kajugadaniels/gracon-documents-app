/**
 * Presents the verification outcome, previews, scores, and next actions.
 */

import {
    VerificationBiometricSummary,
    VerificationIdentitySummary,
    VerificationResultPreviews,
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
        <div
            className="animate-fade-up"
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
        >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ResultStatusBadge passed={result.passed} />
            </div>

            <VerificationResultPreviews
                idCardPreview={idCardPreview}
                selfiePreview={selfiePreview}
                documentMatch={result.documentMatch}
                faceScore={result.faceScore}
            />

            {result.idInfo && (
                <VerificationIdentitySummary
                    idInfo={result.idInfo}
                    documentMatch={result.documentMatch}
                />
            )}

            <VerificationBiometricSummary
                compositeScore={result.compositeScore}
                faceScore={result.faceScore}
                livenessScore={result.livenessScore}
                passed={result.passed}
            />

            {!result.passed && result.failReason && (
                <div
                    style={{
                        background: 'var(--color-error-subtle)',
                        border: '1px solid var(--color-error-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '11px 14px',
                        fontSize: 13,
                        color: 'var(--color-error)',
                        lineHeight: 1.6,
                    }}
                >
                    {result.failReason}
                </div>
            )}

            {!result.passed && result.attemptsRemaining > 0 && (
                <p
                    style={{
                        fontSize: 12,
                        color: 'var(--color-text-muted)',
                        textAlign: 'center',
                        margin: 0,
                    }}
                >
                    {result.attemptsRemaining} attempt
                    {result.attemptsRemaining !== 1 ? 's' : ''} remaining today
                </p>
            )}

            {!result.passed &&
                result.attemptsRemaining === 0 &&
                result.lockout.retryAvailableAt && (
                    <p
                        style={{
                            fontSize: 12,
                            color: 'var(--color-text-muted)',
                            textAlign: 'center',
                            margin: 0,
                            lineHeight: 1.6,
                        }}
                    >
                        Verification is locked for the current window. You can
                        try again after{' '}
                        {new Date(
                            result.lockout.retryAvailableAt,
                        ).toLocaleString()}
                        .
                    </p>
                )}

            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                {result.passed ? (
                    <Button fullWidth size="lg" onClick={onContinue}>
                        {successActionLabel}
                    </Button>
                ) : result.attemptsRemaining > 0 ? (
                    <>
                        <Button
                            variant="ghost"
                            style={{ flex: 1 }}
                            onClick={onRetry}
                        >
                            {retryActionLabel}
                        </Button>
                        <Button style={{ flex: 1 }} onClick={onDashboard}>
                            {dashboardActionLabel}
                        </Button>
                    </>
                ) : (
                    <Button fullWidth variant="ghost" onClick={onDashboard}>
                        {lockedActionLabel}
                    </Button>
                )}
            </div>
        </div>
    );
}
