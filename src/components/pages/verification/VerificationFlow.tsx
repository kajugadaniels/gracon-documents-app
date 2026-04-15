/**
 * Documents-app wrapper around the shared verification flow composer.
 */

import {
    VerificationFlowContent,
} from '@gracon/verification-ui';
import { Card } from '@/components/ui';
import { VerificationCaptureStep } from './VerificationCaptureStep';
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
            <VerificationFlowContent
                config={config}
                controller={controller}
                documentNumberError={documentNumberError}
                documentNumber={documentNumber}
                onDocumentNumberChange={onDocumentNumberChange}
                onNidSubmit={onNidSubmit}
                onContinue={onContinue}
                onDashboard={onDashboard}
                renderCaptureStep={(captureProps) => (
                    <VerificationCaptureStep {...captureProps} />
                )}
                renderResultPanel={(resultProps) => (
                    <VerificationResultPanel
                        result={controller.result!}
                        idCardPreview={controller.idCardPreview}
                        selfiePreview={controller.selfiePreview}
                        {...resultProps}
                    />
                )}
            />
        </Card>
    );
}
