/**
 * Presents the signed-strip preview, QR verification badge, and placement controls.
 */
import type { PointerEventHandler } from 'react';

interface SignatureStripCardProps {
    documentTitle: string;
    signatureImageUrl: string | null;
    qrCodeUrl: string | null;
    canAdjustPlacement: boolean;
    dragging: boolean;
    dirty: boolean;
    persisting: boolean;
    onPointerDown: PointerEventHandler<HTMLDivElement>;
    onReset: () => void;
    onSave: () => void;
}

/**
 * Keeps the signature strip UI simple while still exposing precise placement controls.
 */
export function SignatureStripCard({
    documentTitle,
    signatureImageUrl,
    qrCodeUrl,
    canAdjustPlacement,
    dragging,
    dirty,
    persisting,
    onPointerDown,
    onReset,
    onSave,
}: SignatureStripCardProps) {
    const statusLabel = persisting
        ? 'Saving'
        : dragging
            ? 'Moving'
            : dirty
                ? 'Unsaved'
                : 'Placed';

    return (
        <div style={{ display: 'grid', gap: 8 }}>
            {canAdjustPlacement && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '6px 12px',
                        borderRadius: 999,
                        background: 'rgba(91,35,255,0.08)',
                        border: '1px solid rgba(91,35,255,0.16)',
                        boxShadow: '0 8px 20px rgba(22,16,58,0.06)',
                    }}
                >
                    <span
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: 'var(--color-primary)',
                        }}
                    >
                        Drag freely, then confirm
                    </span>
                    <span
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: dirty ? 'var(--color-warning)' : 'var(--color-text-muted)',
                        }}
                    >
                        {statusLabel}
                    </span>
                </div>
            )}

            <div
                onPointerDown={onPointerDown}
                style={{
                    display: 'grid',
                    gap: 14,
                    padding: '18px 20px',
                    borderRadius: 22,
                    border: dragging
                        ? '1px solid rgba(91,35,255,0.3)'
                        : '1px solid rgba(22,16,58,0.12)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(251,249,255,0.97) 100%)',
                    boxShadow: dragging
                        ? '0 22px 42px rgba(91,35,255,0.14)'
                        : '0 18px 30px rgba(22,16,58,0.06)',
                    userSelect: 'none',
                    cursor: canAdjustPlacement ? (dragging ? 'grabbing' : 'grab') : 'default',
                    touchAction: canAdjustPlacement ? 'none' : 'auto',
                    opacity: persisting ? 0.78 : 1,
                }}
            >
                <div
                    style={{
                        minHeight: 86,
                        paddingBottom: 12,
                        borderBottom: '1px solid rgba(22,16,58,0.08)',
                        display: 'flex',
                        alignItems: 'flex-end',
                    }}
                >
                    {signatureImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={signatureImageUrl}
                            alt={`${documentTitle} signature`}
                            style={{ maxWidth: '100%', maxHeight: 72, objectFit: 'contain' }}
                            draggable={false}
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

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
                                draggable={false}
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
                            Opens the verifier and confirms that {documentTitle} is authentic.
                        </span>
                    </div>
                </div>

                {canAdjustPlacement && (
                    <div
                        data-signature-action="true"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                            flexWrap: 'wrap',
                            borderTop: '1px solid rgba(22,16,58,0.08)',
                            paddingTop: 10,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 11,
                                color: 'var(--color-text-muted)',
                                lineHeight: 1.5,
                                maxWidth: 170,
                            }}
                        >
                            Move the strip anywhere on the free paper area, then save only when it is exact.
                        </span>

                        <div
                            data-signature-action="true"
                            style={{ display: 'flex', gap: 8 }}
                        >
                            <button
                                type="button"
                                data-signature-action="true"
                                onClick={onReset}
                                disabled={persisting || !dirty}
                                className="btn-ghost"
                                style={{ fontSize: 11, padding: '8px 14px' }}
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                data-signature-action="true"
                                onClick={onSave}
                                disabled={persisting || !dirty}
                                className="btn-primary"
                                style={{ fontSize: 11, padding: '8px 14px' }}
                            >
                                {persisting ? 'Saving…' : 'Save Position'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
