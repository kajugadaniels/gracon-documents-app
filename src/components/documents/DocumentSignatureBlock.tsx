'use client';

/**
 * DocumentSignatureBlock
 *
 * Renders the cryptographic signature strip as an absolutely-positioned overlay
 * on the document paper sheet. When `canAdjustPlacement` is true the strip is
 * freely draggable — the normalized (x, y) position (0.0–1.0 of the paper
 * width/height) is persisted on mouse-up via `PATCH /signature-layout`.
 *
 * The component wraps itself in a zero-pointer-events container that fills the
 * entire paper sheet (inset: 0), so the document content below remains
 * interactive. Only the card itself intercepts pointer events.
 *
 * Coordinate parity with PDF export:
 *   Both this component and PdfExportService use the same normalized x/y values,
 *   so `left = x * paperWidth` / `top = y * paperHeight` maps directly to
 *   the PDF pt coordinates used in pdf-lib.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { toDataURL } from 'qrcode';
import { updateSignatureLayout, type DocumentSignatureSnapshot } from '@/api/documents.api';
import { toast } from '@/components/ui';
import { DOCS_URL } from '@/lib/session';

// Block dimensions match the CSS: min(100%, 320px) wide, ~240px tall estimate.
// Used to clamp drag so the card stays fully within the paper bounds.
const BLOCK_W_PX = 320;
const BLOCK_H_PX = 244;
// Paper sheet pixel dimensions (--paper-width / --paper-height CSS variables)
const PAPER_W_PX = 794;
const PAPER_H_PX = 1123;
const MAX_X = (PAPER_W_PX - BLOCK_W_PX) / PAPER_W_PX; // ≈ 0.597
const MAX_Y = (PAPER_H_PX - BLOCK_H_PX) / PAPER_H_PX; // ≈ 0.783

interface DocumentSignatureBlockProps {
    documentId: string;
    documentTitle: string;
    snapshot: DocumentSignatureSnapshot | null;
    canAdjustPlacement?: boolean;
    onSnapshotUpdated?: (snapshot: DocumentSignatureSnapshot | null) => void;
}

export function DocumentSignatureBlock({
    documentId,
    documentTitle,
    snapshot,
    canAdjustPlacement = false,
    onSnapshotUpdated,
}: DocumentSignatureBlockProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [persisting, setPersisting] = useState(false);

    // Local drag position — initialized from snapshot, updated live during drag
    const [pos, setPos] = useState({
        x: snapshot?.x ?? 0.57,
        y: snapshot?.y ?? 0.78,
    });

    // Sync position when snapshot changes externally (e.g. page refetch)
    useEffect(() => {
        if (snapshot?.x != null && snapshot?.y != null) {
            setPos({ x: snapshot.x, y: snapshot.y });
        }
    }, [snapshot?.x, snapshot?.y]);

    // Drag state stored in a ref so mousemove handler always has fresh values
    // without triggering re-renders on every pixel.
    const dragRef = useRef<{
        active: boolean;
        startMouseX: number;
        startMouseY: number;
        startPosX: number;
        startPosY: number;
        containerW: number;
        containerH: number;
    } | null>(null);

    const overlayRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const verificationUrl = useMemo(() => {
        const url = new URL('/verify', DOCS_URL);
        url.searchParams.set('documentId', documentId);
        return url.toString();
    }, [documentId]);

    // Generate QR code data URL
    useEffect(() => {
        let ignore = false;
        toDataURL(verificationUrl, {
            margin: 1,
            width: 160,
            color: { dark: '#16103a', light: '#fcfbff' },
        })
            .then((dataUrl) => { if (!ignore) setQrCodeUrl(dataUrl); })
            .catch(() => { if (!ignore) setQrCodeUrl(null); });
        return () => { ignore = true; };
    }, [verificationUrl]);

    // ── Drag start ──────────────────────────────────────────────────────────────
    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        if (!canAdjustPlacement || !overlayRef.current) return;
        e.preventDefault();

        const rect = overlayRef.current.getBoundingClientRect();
        dragRef.current = {
            active: true,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startPosX: pos.x,
            startPosY: pos.y,
            containerW: rect.width,
            containerH: rect.height,
        };
        isDragging.current = false;
    }

    // ── Global mouse tracking while dragging ────────────────────────────────────
    useEffect(() => {
        function onMouseMove(e: MouseEvent) {
            if (!dragRef.current?.active) return;
            isDragging.current = true;

            const dx = e.clientX - dragRef.current.startMouseX;
            const dy = e.clientY - dragRef.current.startMouseY;
            const newX = Math.max(0, Math.min(MAX_X, dragRef.current.startPosX + dx / dragRef.current.containerW));
            const newY = Math.max(0, Math.min(MAX_Y, dragRef.current.startPosY + dy / dragRef.current.containerH));
            setPos({ x: newX, y: newY });
        }

        async function onMouseUp() {
            if (!dragRef.current?.active) return;
            dragRef.current.active = false;

            if (!isDragging.current) return; // click, not drag — skip persist

            const { x, y } = pos;
            setPersisting(true);
            try {
                const updated = await updateSignatureLayout(documentId, { x, y });
                onSnapshotUpdated?.(updated.signatureSnapshot);
            } catch {
                toast.error('Unable to save signature position right now.');
                // Revert to last known good position from snapshot
                if (snapshot?.x != null && snapshot?.y != null) {
                    setPos({ x: snapshot.x, y: snapshot.y });
                }
            } finally {
                setPersisting(false);
            }
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentId, pos, snapshot]);

    return (
        // Full-sheet overlay — fills the paper via position:absolute inset:0 set by parent.
        // pointer-events:none so document content below stays interactive.
        <div
            ref={overlayRef}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
            {/* Signature card — positioned at normalized (x, y) */}
            <div
                onMouseDown={handleMouseDown}
                style={{
                    position: 'absolute',
                    left: `${pos.x * 100}%`,
                    top: `${pos.y * 100}%`,
                    width: 'min(100%, 320px)',
                    pointerEvents: 'auto',
                    cursor: canAdjustPlacement
                        ? dragRef.current?.active ? 'grabbing' : 'grab'
                        : 'default',
                    userSelect: 'none',
                    // Subtle transition only while not dragging (prevents lag during drag)
                    transition: dragRef.current?.active ? 'none' : 'left 80ms ease, top 80ms ease',
                    opacity: persisting ? 0.7 : 1,
                }}
            >
                {/* Drag hint bar — visible only when adjustable */}
                {canAdjustPlacement && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            marginBottom: 4,
                            padding: '4px 10px',
                            borderRadius: '999px 999px 0 0',
                            background: 'rgba(91,35,255,0.08)',
                            border: '1px solid rgba(91,35,255,0.16)',
                            borderBottom: 'none',
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--color-primary)',
                        }}
                    >
                        <span style={{ fontSize: 12 }}>⠿</span>
                        Drag to reposition
                        {persisting && <span style={{ marginLeft: 4, opacity: 0.6 }}>— saving…</span>}
                    </div>
                )}

                {/* Card body */}
                <div
                    style={{
                        display: 'grid',
                        gap: 14,
                        padding: '18px 20px',
                        borderRadius: canAdjustPlacement ? '0 22px 22px 22px' : 22,
                        border: '1px solid rgba(22,16,58,0.12)',
                        background:
                            'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(251,249,255,0.96) 100%)',
                        boxShadow: '0 18px 30px rgba(22,16,58,0.06)',
                    }}
                >
                    {/* Signature image or fallback text */}
                    <div
                        style={{
                            minHeight: 86,
                            paddingBottom: 12,
                            borderBottom: '1px solid rgba(22,16,58,0.08)',
                            display: 'flex',
                            alignItems: 'flex-end',
                        }}
                    >
                        {snapshot?.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={snapshot.imageUrl}
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

                    {/* QR code + metadata row */}
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
                                Opens the verifier and confirms that{' '}
                                {documentTitle} is authentic.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
