/**
 * Config-driven composition wrapper for the documents verification UI.
 */

import { VerificationStepProgress } from '@gracon/verification-ui';
import { Card } from '@/components/ui';
import { VerificationCaptureStep } from './VerificationCaptureStep';
import { VerificationIdentityStep } from './VerificationIdentityStep';
import { VerificationResultPanel } from './VerificationResultPanel';
import type { VerificationFlowConfig } from './verification-flow-config';
import type { VerificationFlowController } from './use-verification-flow';

type VerificationFlowProps = {
    config: VerificationFlowConfig;
    controller: VerificationFlowController;
    documentNumberError?: string;
    documentNumber: string;
    onDocumentNumberChange: (value: string) => void;
    onNidSubmit: () => void;
    onContinue: () => void;
    onDashboard: () => void;
};

/**
 * Renders the full verification experience from typed mode configuration.
 */
export function VerificationFlow({
    config,
    controller,
    documentNumberError,
    documentNumber,
    onDocumentNumberChange,
    onNidSubmit,
    onContinue,
    onDashboard,
}: VerificationFlowProps) {
    return (
        <Card strength="strong" style={{ width: '100%', maxWidth: 560 }}>
            <div className="animate-fade-up">
                <VerificationStepProgress current={controller.step} />

                {controller.step === 'nid' && (
                    <VerificationIdentityStep
                        title={config.identity.title}
                        description={config.identity.description}
                        error={documentNumberError}
                        value={documentNumber}
                        onChange={onDocumentNumberChange}
                        onSubmit={onNidSubmit}
                    />
                )}

                {controller.step === 'id-card' && (
                    <VerificationCaptureStep
                        title={config.idCard.title}
                        description={config.idCard.description}
                        mode="id-card"
                        captured={controller.idCaptured}
                        backLabel={config.idCard.backLabel}
                        continueLabel={config.idCard.continueLabel}
                        disabledLabel={config.idCard.disabledLabel}
                        onCapture={controller.captureIdCard}
                        onRetake={controller.retakeIdCard}
                        onBack={() => controller.setStep('nid')}
                        onContinue={() => controller.setStep('selfie')}
                    />
                )}

                {controller.step === 'selfie' && (
                    <VerificationCaptureStep
                        title={config.selfie.title}
                        description={config.selfie.description}
                        mode="selfie"
                        captured={controller.selfieCaptured}
                        loading={controller.loading}
                        loadingText={config.selfie.loadingText}
                        backLabel={config.selfie.backLabel}
                        continueLabel={config.selfie.continueLabel}
                        disabledLabel={config.selfie.disabledLabel}
                        onCapture={controller.captureSelfie}
                        onRetake={controller.retakeSelfie}
                        onBack={() => controller.setStep('id-card')}
                        onContinue={controller.submitVerification}
                    />
                )}

                {controller.step === 'result' && controller.result && (
                    <VerificationResultPanel
                        result={controller.result}
                        idCardPreview={controller.idCardPreview}
                        selfiePreview={controller.selfiePreview}
                        successActionLabel={config.result.successActionLabel}
                        retryActionLabel={config.result.retryActionLabel}
                        dashboardActionLabel={config.result.dashboardActionLabel}
                        lockedActionLabel={config.result.lockedActionLabel}
                        onContinue={onContinue}
                        onRetry={controller.resetForRetry}
                        onDashboard={onDashboard}
                    />
                )}
            </div>
        </Card>
    );
}
