/**
 * Shared camera quality analysis helpers for documents verification.
 */

import type { QualityResult } from './hooks/useCamera';

const DARK_THRESHOLD = 55;
const BRIGHT_THRESHOLD = 215;

/**
 * Computes a quality result from the current frame drawn to the given canvas.
 */
export function analyzeCameraFrame(
    video: HTMLVideoElement | null,
    canvas: HTMLCanvasElement | null,
): QualityResult {
    if (!video || !canvas || video.readyState < 2) {
        return {
            score: 0,
            label: 'loading',
            message: 'Starting camera...',
            canCapture: false,
            color: 'var(--color-text-muted)',
        };
    }

    const context = canvas.getContext('2d');
    if (!context) {
        return {
            score: 0,
            label: 'loading',
            message: 'Loading...',
            canCapture: false,
            color: 'var(--color-text-muted)',
        };
    }

    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;

    let totalBrightness = 0;
    let pixelCount = 0;
    for (let index = 0; index < data.length; index += 16) {
        totalBrightness +=
            data[index] * 0.299 +
            data[index + 1] * 0.587 +
            data[index + 2] * 0.114;
        pixelCount += 1;
    }

    const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;
    const grayData: number[] = [];
    for (let index = 0; index < data.length; index += 4) {
        grayData.push(
            data[index] * 0.299 +
                data[index + 1] * 0.587 +
                data[index + 2] * 0.114,
        );
    }

    const width = canvas.width;
    let laplacianSum = 0;
    let laplacianCount = 0;

    for (let y = 1; y < canvas.height - 1; y += 4) {
        for (let x = 1; x < width - 1; x += 4) {
            const current = y * width + x;
            const laplacian = Math.abs(
                -grayData[current - width - 1] -
                    grayData[current - width] -
                    grayData[current - width + 1] -
                    grayData[current - 1] +
                    8 * grayData[current] -
                    grayData[current + 1] -
                    grayData[current + width - 1] -
                    grayData[current + width] -
                    grayData[current + width + 1],
            );
            laplacianSum += laplacian;
            laplacianCount += 1;
        }
    }

    const sharpness = laplacianCount > 0 ? laplacianSum / laplacianCount : 0;

    if (avgBrightness < DARK_THRESHOLD) {
        return {
            score: Math.round((avgBrightness / DARK_THRESHOLD) * 40),
            label: 'dark',
            message: 'Too dark — move to a brighter area or turn on a light',
            canCapture: false,
            color: 'var(--color-error)',
        };
    }

    if (avgBrightness > BRIGHT_THRESHOLD) {
        return {
            score: 60,
            label: 'bright',
            message: 'Too bright — avoid direct light pointing at the camera',
            canCapture: false,
            color: 'var(--color-warning)',
        };
    }

    if (sharpness < 3) {
        return {
            score: 50,
            label: 'blurry',
            message: 'Image is blurry — hold the camera steady',
            canCapture: false,
            color: 'var(--color-warning)',
        };
    }

    const brightnessScore = 100 - Math.abs(avgBrightness - 130) * 0.8;
    const sharpnessScore = Math.min(100, sharpness * 3);
    const score = Math.round((brightnessScore + sharpnessScore) / 2);

    return {
        score: Math.min(100, Math.max(60, score)),
        label: 'good',
        message: 'Lighting looks good — ready to capture',
        canCapture: true,
        color: 'var(--color-success)',
    };
}
