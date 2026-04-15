/**
 * Documents-app adapter around the shared capture-step layout.
 */

import { VerificationCaptureStepLayout } from '@gracon/verification-ui';
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
        <VerificationCaptureStepLayout
            title={title}
            description={description}
            captured={captured}
            loading={loading}
            loadingText={loadingText}
            backLabel={backLabel}
            continueLabel={continueLabel}
            disabledLabel={disabledLabel}
            onBack={onBack}
            onContinue={onContinue}
            captureSlot={
                <CameraCapture
                    mode={mode}
                    onCapture={onCapture}
                    onRetake={onRetake}
                    captured={captured}
                />
            }
        />
    );
}
