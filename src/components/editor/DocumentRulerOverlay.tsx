'use client';

import type {
    MouseEvent as ReactMouseEvent,
    PointerEvent as ReactPointerEvent,
} from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type {
    DocumentLayoutMargins,
    ParagraphIndentation,
} from '@/lib/document-layout';
import {
    clampHorizontalDocumentMargins,
    clampParagraphIndentation,
    MIN_DOCUMENT_MARGIN_PX,
    normalizeParagraphTabStops,
    TAB_STOP_SNAP_PX,
} from '@/lib/document-layout';

const HORIZONTAL_TICKS = Array.from({ length: 17 }, (_, index) => index);
const VERTICAL_TICKS = Array.from({ length: 23 }, (_, index) => index);
const DPI = 96;

interface ParagraphIndentReadout {
    nodeType: 'paragraph' | 'heading';
    leftIndent: number;
    firstLineIndent: number;
    tabStops: number[];
    blockCount: number;
    hasMixedLeftIndent: boolean;
    hasMixedFirstLineIndent: boolean;
    hasMixedTabStops: boolean;
}

interface DocumentRulerOverlayProps {
    width: number;
    height: number;
    margins: DocumentLayoutMargins;
    paragraphIndent?: ParagraphIndentReadout | null;
    disabled?: boolean;
    onHorizontalMarginsPreview?: (margins: Pick<DocumentLayoutMargins, 'left' | 'right'>) => void;
    onHorizontalMarginsCommit?: (margins: Pick<DocumentLayoutMargins, 'left' | 'right'>) => void;
    onParagraphIndentPreview?: (indentation: ParagraphIndentation) => void;
    onParagraphIndentCommit?: (indentation: ParagraphIndentation) => void;
    onParagraphTabStopsChange?: (tabStops: number[]) => void;
}

function isMajorTick(index: number) {
    return index % 2 === 0;
}

function pxToInches(px: number) {
    return (px / DPI).toFixed(2);
}

export function DocumentRulerOverlay({
    width,
    height,
    margins,
    paragraphIndent = null,
    disabled = false,
    onHorizontalMarginsPreview,
    onHorizontalMarginsCommit,
    onParagraphIndentPreview,
    onParagraphIndentCommit,
    onParagraphTabStopsChange,
}: DocumentRulerOverlayProps) {
    const topRulerRef = useRef<HTMLDivElement | null>(null);
    const dragStateRef = useRef<{
        handle: 'left' | 'right' | 'paragraph-left-indent' | 'paragraph-first-line';
        pointerId: number;
    } | null>(null);
    const [activeDragHandle, setActiveDragHandle] = useState<
        'left' | 'right' | 'paragraph-left-indent' | 'paragraph-first-line' | null
    >(null);
    const leftMarginPercent = (margins.left / width) * 100;
    const rightMarginPercent = (margins.right / width) * 100;
    const topMarginPercent = (margins.top / height) * 100;
    const bottomMarginPercent = (margins.bottom / height) * 100;
    const paragraphLeftPercent = paragraphIndent
        ? ((margins.left + paragraphIndent.leftIndent) / width) * 100
        : null;
    const firstLinePercent = paragraphIndent
        ? ((margins.left + paragraphIndent.leftIndent + paragraphIndent.firstLineIndent) / width) * 100
        : null;
    const horizontalSummary = useMemo(
        () => `${pxToInches(margins.left)} in left · ${pxToInches(margins.right)} in right`,
        [margins.left, margins.right],
    );
    const paragraphSummary = useMemo(() => {
        if (!paragraphIndent) return null;

        const targetLabel = paragraphIndent.blockCount > 1
            ? `${paragraphIndent.blockCount} blocks`
            : paragraphIndent.nodeType === 'heading'
                ? 'Heading'
                : 'Paragraph';
        const leftLabel = paragraphIndent.hasMixedLeftIndent
            ? `mixed left, base ${pxToInches(paragraphIndent.leftIndent)} in`
            : `left ${pxToInches(paragraphIndent.leftIndent)} in`;
        const firstLineLabel = paragraphIndent.hasMixedFirstLineIndent
            ? `mixed first line, base ${pxToInches(paragraphIndent.firstLineIndent)} in`
            : `first line ${pxToInches(paragraphIndent.firstLineIndent)} in`;

        return `${targetLabel} · ${leftLabel} · ${firstLineLabel}`;
    }, [paragraphIndent]);
    const tabStopSummary = useMemo(() => {
        if (!paragraphIndent) return null;
        if (paragraphIndent.hasMixedTabStops) {
            return `${paragraphIndent.blockCount} blocks · mixed tab stops`;
        }

        return paragraphIndent.tabStops.length > 0
            ? `${paragraphIndent.tabStops.length} tab stop${paragraphIndent.tabStops.length === 1 ? '' : 's'}`
            : 'No tab stops';
    }, [paragraphIndent]);

    const resolveHorizontalMargins = useCallback((pointerClientX: number, handle: 'left' | 'right') => {
        const rulerEl = topRulerRef.current;
        if (!rulerEl) return null;

        const bounds = rulerEl.getBoundingClientRect();
        const localX = pointerClientX - bounds.left;

        if (handle === 'left') {
            return clampHorizontalDocumentMargins(width, {
                left: Math.round(Math.min(Math.max(localX, MIN_DOCUMENT_MARGIN_PX), width)),
                right: margins.right,
            });
        }

        return clampHorizontalDocumentMargins(width, {
            left: margins.left,
            right: Math.round(Math.min(Math.max(width - localX, MIN_DOCUMENT_MARGIN_PX), width)),
        });
    }, [margins.left, margins.right, width]);

    const resolveParagraphIndentation = useCallback((
        pointerClientX: number,
        handle: 'paragraph-left-indent' | 'paragraph-first-line',
    ) => {
        const rulerEl = topRulerRef.current;
        if (!rulerEl || !paragraphIndent) return null;

        const bounds = rulerEl.getBoundingClientRect();
        const localX = pointerClientX - bounds.left;
        const relativeToPrintableLeft = Math.round(localX - margins.left);

        if (handle === 'paragraph-left-indent') {
            return clampParagraphIndentation(width, margins, {
                leftIndent: relativeToPrintableLeft,
                firstLineIndent: paragraphIndent.firstLineIndent,
            });
        }

        return clampParagraphIndentation(width, margins, {
            leftIndent: paragraphIndent.leftIndent,
            firstLineIndent: relativeToPrintableLeft - paragraphIndent.leftIndent,
        });
    }, [margins, paragraphIndent, width]);

    const resolveTabStopFromPointer = useCallback((pointerClientX: number) => {
        const rulerEl = topRulerRef.current;
        if (!rulerEl) return null;

        const bounds = rulerEl.getBoundingClientRect();
        const relativeToPrintableLeft = pointerClientX - bounds.left - margins.left;
        const snapped = Math.round(relativeToPrintableLeft / TAB_STOP_SNAP_PX) * TAB_STOP_SNAP_PX;

        return normalizeParagraphTabStops(width, margins, [snapped])[0] ?? null;
    }, [margins, width]);

    const addTabStopAtPointer = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
        if (disabled || !paragraphIndent || !onParagraphTabStopsChange) return;
        if (event.target instanceof Element && event.target.closest('button')) return;

        const nextTabStop = resolveTabStopFromPointer(event.clientX);
        if (nextTabStop === null) return;

        onParagraphTabStopsChange(
            normalizeParagraphTabStops(width, margins, [
                ...paragraphIndent.tabStops,
                nextTabStop,
            ]),
        );
    }, [disabled, margins, onParagraphTabStopsChange, paragraphIndent, resolveTabStopFromPointer, width]);

    const removeTabStop = useCallback((tabStop: number) => {
        if (disabled || !paragraphIndent || !onParagraphTabStopsChange) return;

        onParagraphTabStopsChange(
            normalizeParagraphTabStops(
                width,
                margins,
                paragraphIndent.tabStops.filter((value) => value !== tabStop),
            ),
        );
    }, [disabled, margins, onParagraphTabStopsChange, paragraphIndent, width]);

    const stopDragging = useCallback(() => {
        dragStateRef.current = null;
        setActiveDragHandle(null);
        document.body.classList.remove('document-ruler--dragging');
    }, []);

    const handlePointerMove = useCallback((event: PointerEvent) => {
        const dragState = dragStateRef.current;
        if (!dragState) return;

        if (dragState.handle === 'left' || dragState.handle === 'right') {
            const nextMargins = resolveHorizontalMargins(event.clientX, dragState.handle);
            if (!nextMargins) return;
            onHorizontalMarginsPreview?.(nextMargins);
            return;
        }

        const nextIndentation = resolveParagraphIndentation(event.clientX, dragState.handle);
        if (!nextIndentation) return;
        onParagraphIndentPreview?.(nextIndentation);
    }, [onHorizontalMarginsPreview, onParagraphIndentPreview, resolveHorizontalMargins, resolveParagraphIndentation]);

    const detachDragListeners = useCallback((listener: (event: PointerEvent) => void) => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', listener);
        window.removeEventListener('pointercancel', listener);
    }, [handlePointerMove]);

    function handlePointerUp(event: PointerEvent) {
        const dragState = dragStateRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) return;

        if (dragState.handle === 'left' || dragState.handle === 'right') {
            const nextMargins = resolveHorizontalMargins(event.clientX, dragState.handle);
            if (nextMargins) {
                onHorizontalMarginsPreview?.(nextMargins);
                onHorizontalMarginsCommit?.(nextMargins);
            }
        } else {
            const nextIndentation = resolveParagraphIndentation(event.clientX, dragState.handle);
            if (nextIndentation) {
                onParagraphIndentPreview?.(nextIndentation);
                onParagraphIndentCommit?.(nextIndentation);
            }
        }

        stopDragging();
        detachDragListeners(handlePointerUp);
    }

    function beginDrag(
        event: ReactPointerEvent<HTMLButtonElement>,
        handle: 'left' | 'right' | 'paragraph-left-indent' | 'paragraph-first-line',
    ) {
        if (disabled) return;

        event.preventDefault();
        event.stopPropagation();

        dragStateRef.current = {
            handle,
            pointerId: event.pointerId,
        };
        setActiveDragHandle(handle);
        document.body.classList.add('document-ruler--dragging');
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    }

    return (
        <div className="document-ruler-overlay">
            <div
                ref={topRulerRef}
                className={`document-ruler document-ruler--top${disabled ? ' document-ruler--disabled' : ''}`}
                title={paragraphIndent ? 'Double-click the ruler to add a tab stop.' : undefined}
                onDoubleClick={addTabStopAtPointer}
            >
                <span
                    className="document-ruler__margin-zone document-ruler__margin-zone--left"
                    style={{ width: `${leftMarginPercent}%` }}
                />
                <span
                    className="document-ruler__margin-zone document-ruler__margin-zone--right"
                    style={{ width: `${rightMarginPercent}%` }}
                />
                {HORIZONTAL_TICKS.map((tick) => (
                    <span
                        key={`top-${tick}`}
                        className={`document-ruler__tick${isMajorTick(tick) ? ' document-ruler__tick--major' : ''}`}
                        style={{ left: `${(tick / (HORIZONTAL_TICKS.length - 1)) * 100}%` }}
                    >
                        {isMajorTick(tick) && (
                            <span className="document-ruler__label">{tick / 2}</span>
                        )}
                    </span>
                ))}
                {paragraphIndent && paragraphLeftPercent !== null && firstLinePercent !== null && (
                    <>
                        <span
                            className={[
                                'document-ruler__paragraph-marker',
                                'document-ruler__paragraph-marker--left-indent',
                                paragraphIndent.hasMixedLeftIndent ? 'document-ruler__paragraph-marker--mixed' : '',
                                activeDragHandle === 'paragraph-left-indent' ? 'document-ruler__paragraph-marker--active' : '',
                            ].filter(Boolean).join(' ')}
                            style={{ left: `${paragraphLeftPercent}%` }}
                        >
                            <button
                                type="button"
                                className="document-ruler__paragraph-handle"
                                title={paragraphSummary ?? undefined}
                                aria-label={`Paragraph left indent ${pxToInches(paragraphIndent.leftIndent)} inches`}
                                disabled={disabled}
                                onPointerDown={(event) => beginDrag(event, 'paragraph-left-indent')}
                            >
                                <span className="document-ruler__handle-tip">
                                    {paragraphIndent.blockCount > 1 ? `${paragraphIndent.blockCount} blocks · ` : ''}
                                    {paragraphIndent.hasMixedLeftIndent ? 'mixed · ' : ''}
                                    {pxToInches(paragraphIndent.leftIndent)}″
                                </span>
                            </button>
                        </span>
                        <span
                            className={[
                                'document-ruler__paragraph-marker',
                                'document-ruler__paragraph-marker--first-line',
                                paragraphIndent.hasMixedFirstLineIndent ? 'document-ruler__paragraph-marker--mixed' : '',
                                activeDragHandle === 'paragraph-first-line' ? 'document-ruler__paragraph-marker--active' : '',
                            ].filter(Boolean).join(' ')}
                            style={{ left: `${firstLinePercent}%` }}
                        >
                            <button
                                type="button"
                                className="document-ruler__paragraph-handle"
                                title={paragraphSummary ?? undefined}
                                aria-label={`Paragraph first line indent ${pxToInches(paragraphIndent.firstLineIndent)} inches`}
                                disabled={disabled}
                                onPointerDown={(event) => beginDrag(event, 'paragraph-first-line')}
                            >
                                <span className="document-ruler__handle-tip">
                                    {paragraphIndent.blockCount > 1 ? `${paragraphIndent.blockCount} blocks · ` : ''}
                                    {paragraphIndent.hasMixedFirstLineIndent ? 'mixed · ' : ''}
                                    {pxToInches(paragraphIndent.firstLineIndent)}″
                                </span>
                            </button>
                        </span>
                    </>
                )}
                {paragraphIndent?.tabStops.map((tabStop) => (
                    <button
                        key={tabStop}
                        type="button"
                        className={[
                            'document-ruler__tab-stop',
                            paragraphIndent.hasMixedTabStops ? 'document-ruler__tab-stop--mixed' : '',
                        ].filter(Boolean).join(' ')}
                        style={{ left: `${((margins.left + tabStop) / width) * 100}%` }}
                        title={`${tabStopSummary ?? 'Tab stop'} · double-click to remove`}
                        aria-label={`Tab stop ${pxToInches(tabStop)} inches from the left margin`}
                        disabled={disabled}
                        onDoubleClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            removeTabStop(tabStop);
                        }}
                    >
                        <span className="document-ruler__handle-tip">{pxToInches(tabStop)}″ tab</span>
                    </button>
                ))}
                <button
                    type="button"
                    className="document-ruler__handle document-ruler__handle--left"
                    style={{ left: `${leftMarginPercent}%` }}
                    title={horizontalSummary}
                    aria-label={`Left margin ${pxToInches(margins.left)} inches`}
                    disabled={disabled}
                    onPointerDown={(event) => beginDrag(event, 'left')}
                >
                    <span className="document-ruler__handle-tip">{pxToInches(margins.left)}″</span>
                </button>
                <button
                    type="button"
                    className="document-ruler__handle document-ruler__handle--right"
                    style={{ right: `${rightMarginPercent}%` }}
                    title={horizontalSummary}
                    aria-label={`Right margin ${pxToInches(margins.right)} inches`}
                    disabled={disabled}
                    onPointerDown={(event) => beginDrag(event, 'right')}
                >
                    <span className="document-ruler__handle-tip">{pxToInches(margins.right)}″</span>
                </button>
            </div>

            <div className="document-ruler document-ruler--left" style={{ height }}>
                <span
                    className="document-ruler__margin-zone document-ruler__margin-zone--top"
                    style={{ height: `${topMarginPercent}%` }}
                />
                <span
                    className="document-ruler__margin-zone document-ruler__margin-zone--bottom"
                    style={{ height: `${bottomMarginPercent}%` }}
                />
                {VERTICAL_TICKS.map((tick) => (
                    <span
                        key={`left-${tick}`}
                        className={`document-ruler__tick${isMajorTick(tick) ? ' document-ruler__tick--major' : ''}`}
                        style={{ top: `${(tick / (VERTICAL_TICKS.length - 1)) * 100}%` }}
                    >
                        {isMajorTick(tick) && (
                            <span className="document-ruler__label">{tick / 2}</span>
                        )}
                    </span>
                ))}
            </div>
        </div>
    );
}
