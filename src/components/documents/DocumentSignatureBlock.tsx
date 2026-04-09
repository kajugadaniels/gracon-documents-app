'use client';

import { useEffect, useMemo, useState } from 'react';
import { toDataURL } from 'qrcode';
import {
    updateSignatureLayout,
    type DocumentSignatureSnapshot,
} from '@/api/documents.api';
import { toast } from '@/components/ui';
import { DOCS_URL } from '@/lib/session';

interface DocumentSignatureBlockProps {
    documentId: string;
    documentTitle: string;
    snapshot: DocumentSignatureSnapshot | null;
    canAdjustPlacement?: boolean;
    onSnapshotUpdated?: (snapshot: DocumentSignatureSnapshot | null) => void;
}

const ALIGNMENTS = [
    { value: 'LEFT', label: 'Left' },
    { value: 'CENTER', label: 'Center' },
    { value: 'RIGHT', label: 'Right' },
] as const;

function normalizeAlignment(
    value: DocumentSignatureSnapshot['alignment'],
): 'LEFT' | 'CENTER' | 'RIGHT' {
    if (value === 'LEFT' || value === 'CENTER' || value === 'RIGHT') {
        return value;
    }

    return 'RIGHT';
}

function alignmentToFlex(alignment: 'LEFT' | 'CENTER' | 'RIGHT') {
    if (alignment === 'LEFT') return 'flex-start';
    if (alignment === 'CENTER') return 'center';
    return 'flex-end';
}

export function DocumentSignatureBlock({
    documentId,
    documentTitle,
    snapshot,
    canAdjustPlacement = false,
    onSnapshotUpdated,
}: DocumentSignatureBlockProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [updatingAlignment, setUpdatingAlignment] = useState(false);
    const activeAlignment = normalizeAlignment(snapshot?.alignment ?? null);

    const verificationUrl = useMemo(() => {
        const url = new URL('/verify', DOCS_URL);
        url.searchParams.set('documentId', documentId);
        return url.toString();
    }, [documentId]);

    useEffect(() => {
        let ignore = false;

        toDataURL(verificationUrl, {
            margin: 1,
            width: 160,
            color: {
                dark: '#16103a',
                light: '#fcfbff',
            },
        })
            .then((dataUrl) => {
                if (!ignore) {
                    setQrCodeUrl(dataUrl);
                }
            })
            .catch(() => {
                if (!ignore) {
                    setQrCodeUrl(null);
                }
            });

        return () => {
            ignore = true;
        };
    }, [verificationUrl]);

    async function handleAlignmentChange(alignment: 'LEFT' | 'CENTER' | 'RIGHT') {
        if (!canAdjustPlacement || alignment === activeAlignment) {
            return;
        }

        setUpdatingAlignment(true);

        try {
            const updated = await updateSignatureLayout(documentId, alignment);
            onSnapshotUpdated?.(updated.signatureSnapshot);
            toast.success('Signature placement updated.');
        } catch {
            toast.error('Unable to update signature placement right now.');
        } finally {
            setUpdatingAlignment(false);
        }
    }

    return (
        <div
            style={{
                display: 'grid',
                gap: 14,
            }}
        >
            {canAdjustPlacement && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 14,
                        flexWrap: 'wrap',
                    }}
                >
                    <div style={{ display: 'grid', gap: 2 }}>
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                color: 'var(--color-text-muted)',
                            }}
                        >
                            Signature placement
                        </span>
                        <span
                            style={{
                                fontSize: 12,
                                color: 'var(--color-text-secondary)',
                            }}
                        >
                            Choose how the signed strip sits beneath the document body.
                        </span>
                    </div>

                    <div
                        style={{
                            display: 'inline-flex',
                            gap: 6,
                            padding: 4,
                            borderRadius: 999,
                            border: '1px solid rgba(91,35,255,0.14)',
                            background: 'rgba(248,246,255,0.9)',
                        }}
                    >
                        {ALIGNMENTS.map((option) => {
                            const active = activeAlignment === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        void handleAlignmentChange(option.value);
                                    }}
                                    disabled={updatingAlignment}
                                    style={{
                                        border: 'none',
                                        borderRadius: 999,
                                        padding: '8px 14px',
                                        background: active
                                            ? 'var(--color-primary)'
                                            : 'transparent',
                                        color: active
                                            ? '#fff'
                                            : 'var(--color-text-secondary)',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: updatingAlignment ? 'wait' : 'pointer',
                                        transition: 'all 140ms ease',
                                    }}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div
                style={{
                    display: 'flex',
                    justifyContent: alignmentToFlex(activeAlignment),
                    width: '100%',
                }}
            >
                <div
                    style={{
                        width: 'min(100%, 320px)',
                        display: 'grid',
                        gap: 14,
                        padding: '18px 20px',
                        borderRadius: 22,
                        border: '1px solid rgba(22,16,58,0.12)',
                        background:
                            'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(251,249,255,0.96) 100%)',
                        boxShadow: '0 18px 30px rgba(22,16,58,0.06)',
                    }}
                >
                    <div
                        style={{
                            minHeight: 86,
                            paddingBottom: 12,
                            borderBottom: '1px solid rgba(22,16,58,0.08)',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent:
                                activeAlignment === 'LEFT'
                                    ? 'flex-start'
                                    : activeAlignment === 'CENTER'
                                        ? 'center'
                                        : 'flex-end',
                        }}
                    >
                        {snapshot?.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={snapshot.imageUrl}
                                alt={`${documentTitle} signature`}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: 72,
                                    objectFit: 'contain',
                                }}
                            />
                        ) : (
                            <span
                                style={{
                                    fontSize: 18,
                                    fontWeight: 600,
                                    letterSpacing: '0.04em',
                                    color: 'var(--color-text-primary)',
                                }}
                            >
                                Digitally signed
                            </span>
                        )}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                        }}
                    >
                        <div
                            style={{
                                width: 96,
                                height: 96,
                                borderRadius: 14,
                                border: '1px solid rgba(22,16,58,0.12)',
                                background: '#fcfbff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0,
                            }}
                        >
                            {qrCodeUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={qrCodeUrl}
                                    alt={`QR code to verify ${documentTitle}`}
                                    width={96}
                                    height={96}
                                />
                            ) : (
                                <span
                                    style={{
                                        fontSize: 11,
                                        color: 'var(--color-text-muted)',
                                        textAlign: 'center',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Verification
                                    <br />
                                    QR
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'grid', gap: 4 }}>
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    color: 'var(--color-text-muted)',
                                }}
                            >
                                Scan to verify
                            </span>
                            <span
                                style={{
                                    fontSize: 13,
                                    color: 'var(--color-text-secondary)',
                                    lineHeight: 1.5,
                                }}
                            >
                                Opens the verifier and confirms that
                                {' '}
                                {documentTitle}
                                {' '}
                                is authentic.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
