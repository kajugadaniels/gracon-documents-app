'use client';

/**
 * Places the locked-document signature strip on top of the paper surface and
 * only persists x/y coordinates after the user explicitly confirms placement.
 */
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { toDataURL } from 'qrcode';
import { updateSignatureLayout, type DocumentSignatureSnapshot } from '@/api/documents.api';
import { toast } from '@/components/ui';
import { DOCS_URL } from '@/lib/session';
import { SignatureStripCard } from './SignatureStripCard';
import {
    DEFAULT_CONSTRAINTS,
    clampPosition,
    getPersistedPosition,
    measureConstraints,
    positionsEqual,
    type Constraints,
    type DragSession,
    type Position,
} from './signature-placement';

interface DocumentSignatureBlockProps {
    documentId: string;
    documentTitle: string;
    snapshot: DocumentSignatureSnapshot | null;
    canAdjustPlacement?: boolean;
    onSnapshotUpdated?: (snapshot: DocumentSignatureSnapshot | null) => void;
}

/**
 * Renders the signature strip as a movable paper overlay for locked documents.
 */
export function DocumentSignatureBlock({
    documentId,
    documentTitle,
    snapshot,
    canAdjustPlacement = false,
    onSnapshotUpdated,
}: DocumentSignatureBlockProps) {
    const persistedPosition = useMemo(
        () => getPersistedPosition(snapshot),
        [snapshot?.x, snapshot?.y],
    );
    const [constraints, setConstraints] = useState<Constraints>(DEFAULT_CONSTRAINTS);
    const [position, setPosition] = useState<Position>(persistedPosition);
    const [dragging, setDragging] = useState(false);
    const [persisting, setPersisting] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

    const overlayRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragSession | null>(null);
    const positionRef = useRef(position);
    const constraintsRef = useRef(constraints);

    const committedPosition = useMemo(
        () => clampPosition(persistedPosition, constraints),
        [persistedPosition, constraints],
    );
    const dirty = !positionsEqual(position, committedPosition);

    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    useEffect(() => {
        constraintsRef.current = constraints;
    }, [constraints]);

    useEffect(() => {
        setPosition((current) => clampPosition(current, constraints));
    }, [constraints]);

    useEffect(() => {
        setPosition(clampPosition(persistedPosition, constraintsRef.current));
    }, [persistedPosition]);

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
            color: { dark: '#16103a', light: '#fcfbff' },
        })
            .then((dataUrl) => {
                if (!ignore) setQrCodeUrl(dataUrl);
            })
            .catch(() => {
                if (!ignore) setQrCodeUrl(null);
            });

        return () => {
            ignore = true;
        };
    }, [verificationUrl]);

    useEffect(() => {
        const overlayEl = overlayRef.current;
        const cardEl = cardRef.current;
        if (!overlayEl || !cardEl) return;

        const recompute = () => {
            setConstraints(measureConstraints(overlayEl, cardEl));
        };

        recompute();

        const resizeObserver = new ResizeObserver(recompute);
        resizeObserver.observe(overlayEl);
        resizeObserver.observe(cardEl);

        const paperEl = overlayEl.closest('.document-paper-sheet');
        const pagedEditorEl = overlayEl.closest('.document-paged-editor');
        const contentEl = (
            pagedEditorEl?.querySelector('.ProseMirror')
            ?? paperEl?.querySelector('.ProseMirror')
        ) as HTMLElement | null;
        if (paperEl instanceof HTMLElement) resizeObserver.observe(paperEl);
        if (pagedEditorEl instanceof HTMLElement) resizeObserver.observe(pagedEditorEl);
        if (contentEl instanceof HTMLElement) resizeObserver.observe(contentEl);

        window.addEventListener('resize', recompute);
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', recompute);
        };
    }, [documentId, snapshot?.imageUrl]);

    function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
        if (!canAdjustPlacement || persisting || !overlayRef.current) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        const target = event.target as HTMLElement;
        if (target.closest('[data-signature-action="true"]')) {
            return;
        }

        const rect = overlayRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        dragRef.current = {
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: positionRef.current.x,
            startY: positionRef.current.y,
            containerWidth: rect.width,
            containerHeight: rect.height,
        };
        setDragging(true);
    }

    useEffect(() => {
        function endDrag(pointerId: number) {
            if (!dragRef.current || dragRef.current.pointerId !== pointerId) return;
            dragRef.current = null;
            setDragging(false);
        }

        function onPointerMove(event: PointerEvent) {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;

            const next = clampPosition({
                x: drag.startX + (event.clientX - drag.startClientX) / drag.containerWidth,
                y: drag.startY + (event.clientY - drag.startClientY) / drag.containerHeight,
            }, constraintsRef.current);

            setPosition(next);
        }

        function onPointerUp(event: PointerEvent) {
            endDrag(event.pointerId);
        }

        function onPointerCancel(event: PointerEvent) {
            endDrag(event.pointerId);
        }

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerCancel);
        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerCancel);
        };
    }, []);

    async function handleSavePosition() {
        const next = clampPosition(positionRef.current, constraintsRef.current);
        if (positionsEqual(next, committedPosition)) return;

        setPersisting(true);
        try {
            const updated = await updateSignatureLayout(documentId, next);
            onSnapshotUpdated?.(updated.signatureSnapshot);
            toast.success('Signature placement saved.');
        } catch {
            toast.error('Unable to save signature position right now.');
        } finally {
            setPersisting(false);
        }
    }

    function handleResetPosition() {
        setPosition(clampPosition(persistedPosition, constraintsRef.current));
    }

    return (
        <div
            ref={overlayRef}
            style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
        >
            <div
                ref={cardRef}
                style={{
                    position: 'absolute',
                    left: `${position.x * 100}%`,
                    top: `${position.y * 100}%`,
                    width: 'min(100%, 320px)',
                    pointerEvents: 'auto',
                    transition: dragging ? 'none' : 'left 140ms ease, top 140ms ease',
                }}
            >
                <SignatureStripCard
                    documentTitle={documentTitle}
                    signatureImageUrl={snapshot?.imageUrl ?? null}
                    qrCodeUrl={qrCodeUrl}
                    canAdjustPlacement={canAdjustPlacement}
                    dragging={dragging}
                    dirty={dirty}
                    persisting={persisting}
                    onPointerDown={handlePointerDown}
                    onReset={handleResetPosition}
                    onSave={() => {
                        void handleSavePosition();
                    }}
                />
            </div>
        </div>
    );
}
