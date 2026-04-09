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
        return null;
    }

    return (
        <div
            className="glass"
            style={{
                marginTop: 18,
                borderRadius: 'var(--radius-xl)',
                padding: 22,
                display: 'grid',
                gap: 18,
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
                    gridTemplateColumns: 'minmax(220px, 300px) minmax(0, 1fr)',
                    gap: 18,
                }}
            >
                <div
                    style={{
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)',
                        background: 'rgba(255,255,255,0.8)',
                        minHeight: 164,
                        padding: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {snapshot.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={snapshot.imageUrl}
                            alt={snapshot.signerName ?? 'Signature image'}
                            style={{
                                maxWidth: '100%',
                                maxHeight: 110,
                                objectFit: 'contain',
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                textAlign: 'center',
                                display: 'grid',
                                gap: 6,
                                color: 'var(--color-text-muted)',
                            }}
                        >
                            <span style={{ fontSize: 28 }}>✍️</span>
                            <span style={{ fontSize: 12 }}>
                                No visual signature image was saved for this document.
                            </span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
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
                                paddingBottom: 10,
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
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                background: 'rgba(5,150,105,0.06)',
                                border: '1px solid rgba(5,150,105,0.16)',
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
