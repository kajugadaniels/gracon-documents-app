/**
 * Shows captured ID-card and selfie previews with visual match indicators.
 */

import Image from 'next/image';
import type { CSSProperties } from 'react';

type VerificationResultPreviewsProps = {
    idCardPreview: string | null;
    selfiePreview: string | null;
    documentMatch: boolean;
    faceScore: number;
};

function ResultPreviewCard({
    preview,
    alt,
    label,
    borderColor,
    badgeColor,
    badgeLabel,
    imageStyle,
}: {
    preview: string;
    alt: string;
    label: string;
    borderColor: string;
    badgeColor: string;
    badgeLabel: string;
    imageStyle?: CSSProperties;
}) {
    return (
        <div
            style={{
                position: 'relative',
                borderRadius: 12,
                overflow: 'hidden',
                border: `1.5px solid ${borderColor}`,
                height: 130,
                background: '#000',
            }}
        >
            <Image
                src={preview}
                alt={alt}
                fill
                unoptimized
                sizes="(max-width: 768px) 45vw, 220px"
                style={{ objectFit: 'cover', opacity: 0.92, ...imageStyle }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.72))',
                    padding: '20px 8px 7px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.85)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                }}
            >
                {label}
            </div>
            <div
                style={{
                    position: 'absolute',
                    top: 7,
                    right: 7,
                    background: badgeColor,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 999,
                    backdropFilter: 'blur(6px)',
                }}
            >
                {badgeLabel}
            </div>
        </div>
    );
}

/**
 * Renders photo previews when the verification result includes local captures.
 */
export function VerificationResultPreviews({
    idCardPreview,
    selfiePreview,
    documentMatch,
    faceScore,
}: VerificationResultPreviewsProps) {
    if (!idCardPreview && !selfiePreview) {
        return null;
    }

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
            }}
        >
            {idCardPreview && (
                <ResultPreviewCard
                    preview={idCardPreview}
                    alt="ID card"
                    label="ID Card"
                    borderColor={
                        documentMatch
                            ? 'rgba(5,150,105,0.35)'
                            : 'rgba(220,38,38,0.35)'
                    }
                    badgeColor={
                        documentMatch
                            ? 'rgba(5,150,105,0.88)'
                            : 'rgba(220,38,38,0.88)'
                    }
                    badgeLabel={documentMatch ? '✓ Matched' : '✗ No match'}
                />
            )}

            {selfiePreview && (
                <ResultPreviewCard
                    preview={selfiePreview}
                    alt="Selfie"
                    label="Selfie"
                    borderColor={
                        faceScore >= 70
                            ? 'rgba(96,165,250,0.40)'
                            : 'rgba(220,38,38,0.35)'
                    }
                    badgeColor={
                        faceScore >= 70
                            ? 'rgba(59,130,246,0.88)'
                            : 'rgba(220,38,38,0.88)'
                    }
                    badgeLabel={`${Math.round(faceScore)}% face`}
                    imageStyle={{ objectPosition: 'top' }}
                />
            )}
        </div>
    );
}
