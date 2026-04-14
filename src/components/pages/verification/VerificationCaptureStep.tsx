/**
 * Reusable camera-capture step used for both ID card and selfie collection.
 */

import { Button } from '@/components/ui';
import { CameraCapture } from './CameraCapture';

type VerificationCaptureStepProps = {
    title: string;
    description: string;
    mode: 'id-card' | 'selfie';
    captured: boolean;
    loading?: boolean;
    loadingText?: string;
    backLabel: string;
    continueLabel: string;
    disabledLabel: string;
    onCapture: (preview: string, file: File) => void;
    onRetake: () => void;
    onBack: () => void;
    onContinue: () => void;
};

/**
 * Shows camera guidance, the capture widget, and back/continue actions.
 */
export function VerificationCaptureStep({
    title,
    description,
    mode,
    captured,
    loading = false,
    loadingText,
    backLabel,
    continueLabel,
    disabledLabel,
    onCapture,
    onRetake,
    onBack,
    onContinue,
}: VerificationCaptureStepProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
                <h1
                    style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        marginBottom: 8,
                        letterSpacing: '-0.02em',
                    }}
                >
                    {title}
                </h1>
                <p
                    style={{
                        fontSize: 14,
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.6,
                    }}
                >
                    {description}
                </p>
            </div>

            <CameraCapture
                mode={mode}
                onCapture={onCapture}
                onRetake={onRetake}
                captured={captured}
            />

            <div style={{ display: 'flex', gap: 12 }}>
                <Button variant="ghost" onClick={onBack} style={{ flex: 1 }}>
                    {backLabel}
                </Button>
                <Button
                    disabled={!captured || loading}
                    loading={loading}
                    loadingText={loadingText}
                    onClick={onContinue}
                    style={{ flex: 2 }}
                >
                    {captured ? continueLabel : disabledLabel}
                </Button>
            </div>
        </div>
    );
}
