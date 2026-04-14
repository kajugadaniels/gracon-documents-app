'use client';

/**
 * Camera capture hook used by the documents verification flow.
 */

import type { RefObject } from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { analyzeCameraFrame } from '../camera-quality';

export interface QualityResult {
    score: number;
    label: 'good' | 'dark' | 'bright' | 'blurry' | 'loading';
    message: string;
    canCapture: boolean;
    color: string;
}

export type CameraFacing = 'user' | 'environment';

interface UseCameraOptions {
    facing?: CameraFacing;
    onCapture?: (dataUrl: string, file: File) => void;
}

interface UseCameraReturn {
    videoRef: RefObject<HTMLVideoElement | null>;
    canvasRef: RefObject<HTMLCanvasElement | null>;
    isReady: boolean;
    hasPermission: boolean | null;
    permissionError: string | null;
    facing: CameraFacing;
    quality: QualityResult;
    capturedImage: string | null;
    isAnalyzing: boolean;
    startCamera: () => Promise<void>;
    stopCamera: () => void;
    flipCamera: () => void;
    capture: () => void;
    retake: () => void;
}

const ANALYSIS_INTERVAL = 800;

/**
 * Manages browser camera access, quality estimation, and image capture.
 */
export function useCamera({
    facing: initialFacing = 'environment',
    onCapture,
}: UseCameraOptions = {}): UseCameraReturn {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [isReady, setIsReady] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [facing, setFacing] = useState<CameraFacing>(initialFacing);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [quality, setQuality] = useState<QualityResult>({
        score: 0,
        label: 'loading',
        message: 'Starting camera...',
        canCapture: false,
        color: 'var(--color-text-muted)',
    });

    const stopStream = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsReady(false);
    }, []);

    const analyzeFrame = useCallback(
        () => analyzeCameraFrame(videoRef.current, canvasRef.current),
        [],
    );

    const startCamera = useCallback(async () => {
        stopStream();
        setIsReady(false);
        setIsAnalyzing(true);
        setPermissionError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facing,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            });
            streamRef.current = stream;
            setHasPermission(true);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setIsReady(true);
                setIsAnalyzing(false);
                intervalRef.current = setInterval(() => {
                    setQuality(analyzeFrame());
                }, ANALYSIS_INTERVAL);
            }
        } catch (error: unknown) {
            setHasPermission(false);
            setIsAnalyzing(false);

            if (!(error instanceof Error)) {
                return;
            }

            if (
                error.name === 'NotAllowedError' ||
                error.name === 'PermissionDeniedError'
            ) {
                setPermissionError(
                    'Camera access denied. Please allow camera access in your browser settings and refresh the page.',
                );
                return;
            }

            if (error.name === 'NotFoundError') {
                setPermissionError('No camera found on this device.');
                return;
            }

            if (error.name === 'NotReadableError') {
                setPermissionError(
                    'Camera is in use by another application. Please close it and try again.',
                );
                return;
            }

            setPermissionError(`Camera error: ${error.message}`);
        }
    }, [analyzeFrame, facing, stopStream]);

    const flipCamera = useCallback(() => {
        setFacing((prev) => (prev === 'user' ? 'environment' : 'user'));
        setCapturedImage(null);
    }, []);

    const capture = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) {
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        if (facing === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedImage(dataUrl);

        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    return;
                }
                onCapture?.(
                    dataUrl,
                    new File([blob], `capture-${Date.now()}.jpg`, {
                        type: 'image/jpeg',
                    }),
                );
            },
            'image/jpeg',
            0.92,
        );

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, [facing, onCapture]);

    const retake = useCallback(() => {
        setCapturedImage(null);

        if (isReady && !intervalRef.current) {
            intervalRef.current = setInterval(() => {
                setQuality(analyzeFrame());
            }, ANALYSIS_INTERVAL);
        }
    }, [analyzeFrame, isReady]);
    useEffect(() => stopStream, [stopStream]);

    return {
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
        stopCamera: stopStream,
        flipCamera,
        capture,
        retake,
    };
}
