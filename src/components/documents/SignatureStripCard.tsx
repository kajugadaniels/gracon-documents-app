/**
 * SignatureStripCard
 *
 * A draggable digital-notary certification block placed on locked documents.
 * Renders the signature image, a QR verification code, and — when editable —
 * placement controls for repositioning and saving the block on the paper.
 *
 * Design language: official document seal — clean, document-appropriate,
 * distinct from the glassmorphism app shell.
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

/** Checkmark SVG for the verified header band. */
function CheckIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" stroke="#15803d" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Drag-handle icon for the placement hint row. */
function DragIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="9" cy="7"  r="1.5" fill="#999" />
            <circle cx="15" cy="7"  r="1.5" fill="#999" />
            <circle cx="9" cy="12" r="1.5" fill="#999" />
            <circle cx="15" cy="12" r="1.5" fill="#999" />
            <circle cx="9" cy="17" r="1.5" fill="#999" />
            <circle cx="15" cy="17" r="1.5" fill="#999" />
        </svg>
    );
}

/** Renders the full-width status pill shown above the card when placement is active. */
function PlacementHint({
    dirty,
    dragging,
    persisting,
}: {
    dirty: boolean;
    dragging: boolean;
    persisting: boolean;
}) {
    const label = persisting ? 'Saving…' : dragging ? 'Moving' : dirty ? 'Unsaved changes' : 'Position saved';
    const labelColor = persisting
        ? '#6b7280'
        : dragging
            ? 'var(--color-primary)'
            : dirty
                ? '#b45309'
                : '#15803d';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '5px 10px',
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.18)',
            borderLeft: '3px solid var(--color-primary)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            fontSize: 11,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <DragIcon />
                <span style={{ color: '#444', fontWeight: 500 }}>Drag to reposition</span>
            </div>
            <span style={{ fontWeight: 600, color: labelColor }}>{label}</span>
        </div>
    );
}

/** The main certification card — signature image, header seal, QR code, and verify text. */
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
    return (
        <div style={{ display: 'grid', gap: 6, width: 344 }}>

            {/* ── Placement hint pill ── */}
            {canAdjustPlacement && (
                <PlacementHint dirty={dirty} dragging={dragging} persisting={persisting} />
            )}

            {/* ── Main card ── */}
            <div
                onPointerDown={onPointerDown}
                style={{
                    background: '#ffffff',
                    border: `1px solid ${dragging ? 'rgba(91,35,255,0.35)' : 'rgba(0,0,0,0.18)'}`,
                    borderLeft: `4px solid ${dragging ? 'var(--color-primary)' : '#15803d'}`,
                    boxShadow: dragging
                        ? '0 16px 36px rgba(91,35,255,0.14), 0 4px 12px rgba(0,0,0,0.12)'
                        : '0 2px 8px rgba(0,0,0,0.12)',
                    cursor: canAdjustPlacement ? (dragging ? 'grabbing' : 'grab') : 'default',
                    userSelect: 'none',
                    touchAction: canAdjustPlacement ? 'none' : 'auto',
                    opacity: persisting ? 0.75 : 1,
                    transition: dragging ? 'none' : 'box-shadow 160ms ease, border-color 160ms ease',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Top header band — verified seal */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '7px 14px',
                    background: '#f0fdf4',
                    borderBottom: '1px solid rgba(21,128,61,0.18)',
                }}>
                    <CheckIcon />
                    <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#15803d',
                    }}>
                        Digitally Signed &amp; Verified
                    </span>
                    {/* Decorative stamp watermark */}
                    <span style={{
                        marginLeft: 'auto',
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'rgba(21,128,61,0.18)',
                    }}>
                        AUTHENTIC
                    </span>
                </div>

                {/* Signature display area */}
                <div style={{
                    padding: '18px 16px 14px',
                    minHeight: 80,
                    display: 'flex',
                    alignItems: 'flex-end',
                    borderBottom: '1px solid rgba(0,0,0,0.07)',
                    position: 'relative',
                    background: '#fafafa',
                }}>
                    {/* Signature line underlay */}
                    <div style={{
                        position: 'absolute',
                        bottom: 22,
                        left: 16,
                        right: 16,
                        height: 1,
                        background: 'rgba(0,0,0,0.1)',
                    }} />

                    {signatureImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={signatureImageUrl}
                            alt={`${documentTitle} signature`}
                            style={{ maxWidth: '100%', maxHeight: 56, objectFit: 'contain', position: 'relative', zIndex: 1 }}
                            draggable={false}
                        />
                    ) : (
                        <span style={{
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            fontSize: 22,
                            fontStyle: 'italic',
                            color: '#1e3a5f',
                            letterSpacing: '0.02em',
                            position: 'relative',
                            zIndex: 1,
                        }}>
                            Digitally signed
                        </span>
                    )}
                </div>

                {/* Bottom row: QR code + verification info */}
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    {/* QR code column */}
                    <div style={{
                        flexShrink: 0,
                        width: 90,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px 8px',
                        borderRight: '1px solid rgba(0,0,0,0.07)',
                        background: '#f8f8f8',
                    }}>
                        {qrCodeUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={qrCodeUrl}
                                alt={`QR code to verify ${documentTitle}`}
                                width={70}
                                height={70}
                                draggable={false}
                            />
                        ) : (
                            <div style={{
                                width: 70,
                                height: 70,
                                background: '#ececec',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 9,
                                color: '#aaa',
                                textAlign: 'center',
                                lineHeight: 1.5,
                            }}>
                                QR<br />CODE
                            </div>
                        )}
                    </div>

                    {/* Verification info column */}
                    <div style={{
                        flex: 1,
                        padding: '10px 12px',
                        display: 'grid',
                        gap: 4,
                        alignContent: 'center',
                    }}>
                        <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: '#888',
                        }}>
                            Scan to verify
                        </span>
                        <span style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#222',
                            lineHeight: 1.3,
                            wordBreak: 'break-word',
                        }}>
                            {documentTitle}
                        </span>
                        <span style={{
                            fontSize: 10,
                            color: '#888',
                            lineHeight: 1.5,
                        }}>
                            Scan the QR code to confirm this document is authentic and unmodified.
                        </span>
                    </div>
                </div>

                {/* Placement action controls */}
                {canAdjustPlacement && (
                    <div
                        data-signature-action="true"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '8px 12px',
                            borderTop: '1px solid rgba(0,0,0,0.08)',
                            background: '#f9f9f9',
                        }}
                    >
                        <span style={{
                            fontSize: 10,
                            color: '#999',
                            lineHeight: 1.4,
                            maxWidth: 150,
                        }}>
                            Position it precisely, then save.
                        </span>
                        <div data-signature-action="true" style={{ display: 'flex', gap: 6 }}>
                            <button
                                type="button"
                                data-signature-action="true"
                                onClick={onReset}
                                disabled={persisting || !dirty}
                                className="btn-ghost"
                                style={{ fontSize: 10, padding: '5px 11px' }}
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                data-signature-action="true"
                                onClick={onSave}
                                disabled={persisting || !dirty}
                                className="btn-primary"
                                style={{ fontSize: 10, padding: '5px 11px' }}
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
