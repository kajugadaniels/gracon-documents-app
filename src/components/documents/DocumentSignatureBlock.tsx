'use client';

import type { DocumentSignatureSnapshot } from '@/api/documents.api';

interface DocumentSignatureBlockProps {
    snapshot: DocumentSignatureSnapshot | null;
    contentHash: string | null;
}

function formatDateTime(value: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleString();
}

export function DocumentSignatureBlock({
    snapshot,
    contentHash,
}: DocumentSignatureBlockProps) {
    if (!snapshot) {
        return (
            <div
                style={{
                    display: 'grid',
                    gap: 16,
                }}
            >
                <div>
                    <p
                        style={{
                            margin: '0 0 4px',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: 'var(--color-text-muted)',
                        }}
                    >
                        Signed Document Evidence
                    </p>
                    <p
                        style={{
                            margin: 0,
                            fontSize: 14,
                            color: 'var(--color-text-secondary)',
                            lineHeight: 1.6,
                        }}
                    >
                        This document was locked before visual signature snapshots were introduced.
                        Its cryptographic lock is still valid, but no embedded signature image was preserved.
                    </p>
                </div>

                {contentHash && (
                    <div
                        style={{
                            padding: '14px 16px',
                            borderRadius: 18,
                            background: 'rgba(5,150,105,0.05)',
                            border: '1px solid rgba(5,150,105,0.14)',
                            display: 'grid',
                            gap: 6,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: 'var(--color-text-muted)',
                            }}
                        >
                            Document Hash
                        </span>
                        <span
                            style={{
                                fontSize: 11,
                                fontFamily: 'monospace',
                                color: 'var(--color-text-secondary)',
                                wordBreak: 'break-all',
                            }}
                        >
                            {contentHash}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'grid',
                gap: 24,
            }}
        >
            <div>
                <p
                    style={{
                        margin: '0 0 4px',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--color-text-muted)',
                    }}
                >
                    Signed Document Evidence
                </p>
                <p
                    style={{
                        margin: 0,
                        fontSize: 14,
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.6,
                    }}
                >
                    This block is the frozen visual signature snapshot saved when the document was locked.
                </p>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 22,
                    alignItems: 'start',
                }}
            >
                <div
                    style={{
                        borderRadius: 24,
                        border: '1px solid rgba(91,35,255,0.12)',
                        background: 'linear-gradient(180deg, rgba(248,246,255,0.98) 0%, rgba(241,237,255,0.94) 100%)',
                        minHeight: 208,
                        padding: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: 'linear-gradient(to bottom, transparent 0, transparent calc(100% - 40px), rgba(91,35,255,0.1) calc(100% - 40px), rgba(91,35,255,0.1) calc(100% - 39px), transparent calc(100% - 39px))',
                            pointerEvents: 'none',
                        }}
                    />
                    {snapshot.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={snapshot.imageUrl}
                            alt={snapshot.signerName ?? 'Signature image'}
                            style={{
                                maxWidth: '100%',
                                maxHeight: 126,
                                objectFit: 'contain',
                                position: 'relative',
                                zIndex: 1,
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                textAlign: 'center',
                                display: 'grid',
                                gap: 8,
                                color: 'var(--color-text-muted)',
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            <span style={{ fontSize: 28 }}>✍️</span>
                            <span style={{ fontSize: 12 }}>
                                No visual signature image was saved for this document.
                            </span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                    {[
                        { label: 'Signed by', value: snapshot.signerName ?? '—' },
                        { label: 'Signed at', value: formatDateTime(snapshot.signedAt) },
                        { label: 'Locked at', value: formatDateTime(snapshot.lockedAt) },
                        { label: 'Certificate ID', value: snapshot.certificateId ?? '—', mono: true },
                        { label: 'Signature record', value: snapshot.signatureId ?? '—', mono: true },
                    ].map((item) => (
                        <div
                            key={item.label}
                            style={{
                                display: 'grid',
                                gap: 4,
                                padding: '0 0 12px',
                                borderBottom: '1px solid rgba(22,16,58,0.08)',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    color: 'var(--color-text-muted)',
                                }}
                            >
                                {item.label}
                            </span>
                            <span
                                style={{
                                    fontSize: 13,
                                    color: 'var(--color-text-primary)',
                                    fontWeight: 500,
                                    fontFamily: item.mono ? 'monospace' : 'inherit',
                                    wordBreak: item.mono ? 'break-all' : 'normal',
                                }}
                            >
                                {item.value}
                            </span>
                        </div>
                    ))}

                    {contentHash && (
                        <div
                            style={{
                                padding: '14px 16px',
                                borderRadius: 18,
                                background: 'rgba(5,150,105,0.05)',
                                border: '1px solid rgba(5,150,105,0.14)',
                                display: 'grid',
                                gap: 6,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    color: 'var(--color-text-muted)',
                                }}
                            >
                                Document Hash
                            </span>
                            <span
                                style={{
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    color: 'var(--color-text-secondary)',
                                    wordBreak: 'break-all',
                                }}
                            >
                                {contentHash}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
