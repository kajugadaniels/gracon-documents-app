'use client';

type VerifySigner = {
    name: string;
    email: string;
    signedAt: string;
    isOwner: boolean;
    signingOrder: number;
};

interface VerifySignerChainProps {
    signers: VerifySigner[];
}

function formatDateTime(value: string) {
    return new Date(value).toLocaleString();
}

/** Renders the immutable signing order returned by the verification endpoint. */
export function VerifySignerChain({ signers }: VerifySignerChainProps) {
    if (signers.length === 0) {
        return null;
    }

    return (
        <div
            style={{
                marginTop: 16,
                display: 'grid',
                gap: 10,
            }}
        >
            <div>
                <p
                    style={{
                        margin: '0 0 4px',
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                    }}
                >
                    Verified signing chain
                </p>
                <p
                    style={{
                        margin: 0,
                        fontSize: 12,
                        color: 'var(--color-success)',
                        opacity: 0.85,
                    }}
                >
                    {signers.length} completed signature{signers.length === 1 ? '' : 's'} verified in recorded order
                </p>
            </div>

            {signers.map((signer) => (
                <div
                    key={`${signer.signingOrder}-${signer.email}`}
                    style={{
                        display: 'grid',
                        gap: 4,
                        padding: '10px 12px',
                        background: 'rgba(52,211,153,0.08)',
                        border: '1px solid rgba(52,211,153,0.16)',
                        borderRadius: 10,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                            flexWrap: 'wrap',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                            }}
                        >
                            <span
                                style={{
                                    minWidth: 22,
                                    height: 22,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 999,
                                    background: 'rgba(52,211,153,0.18)',
                                    color: 'var(--color-success)',
                                    fontSize: 11,
                                    fontWeight: 800,
                                }}
                            >
                                {signer.signingOrder}
                            </span>
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: 'var(--color-success)',
                                }}
                            >
                                {signer.name}
                            </span>
                            {signer.isOwner && (
                                <span
                                    style={{
                                        padding: '2px 7px',
                                        borderRadius: 999,
                                        background: 'rgba(91,35,255,0.10)',
                                        color: 'var(--color-primary)',
                                        fontSize: 9,
                                        fontWeight: 800,
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Owner
                                </span>
                            )}
                        </div>

                        <span
                            style={{
                                fontSize: 11,
                                color: 'var(--color-text-muted)',
                            }}
                        >
                            {formatDateTime(signer.signedAt)}
                        </span>
                    </div>

                    <div
                        style={{
                            fontSize: 12,
                            color: 'var(--color-text-secondary)',
                            wordBreak: 'break-word',
                        }}
                    >
                        {signer.email}
                    </div>
                </div>
            ))}
        </div>
    );
}
