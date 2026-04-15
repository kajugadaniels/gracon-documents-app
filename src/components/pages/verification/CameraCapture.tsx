'use client';

/**
 * Camera capture widget used by the documents verification page.
 */

import { useEffect } from 'react';
import {
    CameraCaptureReview,
    CameraPermissionDenied,
    VerificationCameraViewport,
    useCamera,
    type CameraFacing,
} from '@gracon/verification-ui';
import { Button, PremiumLoader } from '@/components/ui';

interface CameraCaptureProps {
    mode: 'id-card' | 'selfie';
    onCapture: (dataUrl: string, file: File) => void;
    onRetake?: () => void;
    captured: boolean;
}

/**
 * Captures an ID-card or selfie image using the browser camera.
 */
export function CameraCapture({
    mode,
    onCapture,
    onRetake,
    captured,
}: CameraCaptureProps) {
    const defaultFacing: CameraFacing =
        mode === 'selfie' ? 'user' : 'environment';

    const {
        videoRef,
        canvasRef,
        isReady,
        hasPermission,
        permissionError,
        facing,
        quality,
        capturedImage,
        isAnalyzing,
        startCamera,
        flipCamera,
        capture,
        retake,
    } = useCamera({
        facing: defaultFacing,
        onCapture,
    });

    useEffect(() => {
        void startCamera();
    }, [startCamera]);

    if (hasPermission === false && permissionError) {
        return (
            <CameraPermissionDenied
                error={permissionError}
                onRetry={startCamera}
            />
        );
    }

    if (capturedImage) {
        return (
            <CameraCaptureReview
                imageUrl={capturedImage}
                mode={mode}
                onRetake={() => {
                    retake();
                    onRetake?.();
                }}
            />
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <VerificationCameraViewport
                mode={mode}
                captured={captured}
                isReady={isReady}
                isAnalyzing={isAnalyzing}
                facing={facing}
                quality={quality}
                videoRef={videoRef}
                canvasRef={canvasRef}
                onFlipCamera={flipCamera}
                loadingOverlaySlot={
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(7,7,26,0.75)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                        }}
                    >
                        <PremiumLoader size={36} color="primary" />
                        <span
                            style={{
                                fontSize: 13,
                                color: 'rgba(255,255,255,0.7)',
                                fontWeight: 500,
                            }}
                        >
                            Starting camera...
                        </span>
                    </div>
                }
            />

            <Button
                fullWidth
                onClick={capture}
                disabled={!isReady || !quality.canCapture}
            >
                {mode === 'id-card' ? 'Capture ID card' : 'Capture selfie'}
            </Button>
        </div>
    );
}
