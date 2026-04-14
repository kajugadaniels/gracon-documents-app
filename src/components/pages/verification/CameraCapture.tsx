'use client';

/**
 * Camera capture widget used by the documents verification page.
 */

import { useEffect } from 'react';
import { Button, PremiumLoader } from '@/components/ui';
import {
    useCamera,
    type CameraFacing,
} from './hooks/useCamera';
import {
    CameraCaptureReview,
    CameraPermissionDenied,
    CameraQualityBar,
} from './CameraCaptureUi';

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

    const aspectRatio = mode === 'id-card' ? '16/10' : '3/4';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
                style={{
                    position: 'relative',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#000',
                    aspectRatio,
                    border: `2px solid ${
                        quality.label === 'good'
                            ? 'var(--color-success-border)'
                            : quality.label === 'loading'
                              ? 'var(--color-border)'
                              : `${quality.color}66`
                    }`,
                    transition: 'border-color 400ms ease',
                }}
            >
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        transform: facing === 'user' ? 'scaleX(-1)' : 'none',
                    }}
                />

                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {mode === 'id-card' && isReady && !captured && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                        }}
                    >
                        <div
                            style={{
                                width: '82%',
                                height: '72%',
                                border: '2px dashed rgba(255,255,255,0.45)',
                                borderRadius: 8,
                                boxShadow:
                                    'inset 0 0 0 4000px rgba(0,0,0,0.15)',
                            }}
                        />
                    </div>
                )}

                {mode === 'selfie' && isReady && !captured && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                        }}
                    >
                        <div
                            style={{
                                width: '65%',
                                height: '75%',
                                border: '2px dashed rgba(255,255,255,0.45)',
                                borderRadius: '50%',
                            }}
                        />
                    </div>
                )}

                {(isAnalyzing || !isReady) && (
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
                )}

                {isReady && (
                    <>
                        <div
                            style={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                display: 'flex',
                                gap: 8,
                            }}
                        >
                            <button
                                onClick={flipCamera}
                                aria-label="Flip camera"
                                title={`Switch to ${
                                    facing === 'user' ? 'back' : 'front'
                                } camera`}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.55)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255,255,255,0.20)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                }}
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M20 7h-3a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                                    <circle cx="12" cy="13" r="3" />
                                    <path d="M14 2h-4l-1 2h6l-1-2z" />
                                </svg>
                            </button>
                        </div>

                        <div
                            style={{
                                position: 'absolute',
                                top: 12,
                                left: 12,
                                background: 'rgba(0,0,0,0.55)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: 20,
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 500,
                                color: 'rgba(255,255,255,0.80)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                            }}
                        >
                            <span style={{ fontSize: 9 }}>●</span>
                            {facing === 'user' ? 'Front camera' : 'Back camera'}
                        </div>
                    </>
                )}
            </div>

            {isReady && <CameraQualityBar quality={quality} />}

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
