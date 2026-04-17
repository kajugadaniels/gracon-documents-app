'use client';

import type {
    MouseEvent as ReactMouseEvent,
    PointerEvent as ReactPointerEvent,
    RefObject,
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentPaginationPage } from './use-document-pagination';
import type {
    DocumentLayoutMargins,
    ParagraphIndentation,
    ParagraphTabStop,
    ParagraphTabStopAlign,
} from '@/lib/document-layout';
import {
    clampHorizontalDocumentMargins,
    clampParagraphIndentation,
    MIN_DOCUMENT_MARGIN_PX,
    normalizeParagraphTabStops,
    TAB_STOP_SNAP_PX,
} from '@/lib/document-layout';

const HORIZONTAL_TICKS = Array.from({ length: 17 }, (_, index) => index);
const VERTICAL_TICKS = Array.from({ length: 24 }, (_, index) => index);
const DPI = 96;
const A4_HEIGHT_IN = 11.69;
const DRAG_CLICK_THRESHOLD_PX = 4;
const TAB_STOP_ALIGN_OPTIONS: {
    align: ParagraphTabStopAlign;
    label: string;
    description: string;
}[] = [
    { align: 'left', label: 'Left', description: 'Text starts at the stop' },
    { align: 'center', label: 'Center', description: 'Text centers on the stop' },
    { align: 'right', label: 'Right', description: 'Text ends at the stop' },
    { align: 'decimal', label: 'Decimal', description: 'Numbers align on decimals' },
];

interface ParagraphIndentReadout {
    nodeType: 'paragraph' | 'heading';
    leftIndent: number;
    firstLineIndent: number;
    tabStops: ParagraphTabStop[];
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
    /** Controls which ruler axes are rendered. Defaults to 'full'. */
    rulerMode?: 'full' | 'top-only' | 'left-only';
    onHorizontalMarginsPreview?: (margins: Pick<DocumentLayoutMargins, 'left' | 'right'>) => void;
    onHorizontalMarginsCommit?: (margins: Pick<DocumentLayoutMargins, 'left' | 'right'>) => void;
    onParagraphIndentPreview?: (indentation: ParagraphIndentation) => void;
    onParagraphIndentCommit?: (indentation: ParagraphIndentation) => void;
    onParagraphTabStopsChange?: (tabStops: ParagraphTabStop[]) => void;
}

function isMajorTick(index: number) {
    return index % 2 === 0;
}

function pxToInches(px: number) {
    return (px / DPI).toFixed(2);
}

function getTabStopLabel(align: ParagraphTabStopAlign) {
    if (align === 'center') return 'Center tab';
    if (align === 'right') return 'Right tab';
    if (align === 'decimal') return 'Decimal tab';
    return 'Left tab';
}

function getTabStopGlyph(align: ParagraphTabStopAlign) {
    if (align === 'center') return 'T';
    if (align === 'right') return 'R';
    if (align === 'decimal') return '.';
    return 'L';
}

function getTabStopKey(tabStop: ParagraphTabStop) {
    return `${tabStop.position}:${tabStop.align}`;
}

type RulerDragState =
    | {
        handle: 'left' | 'right' | 'paragraph-left-indent' | 'paragraph-first-line';
        pointerId: number;
    }
    | {
        handle: 'paragraph-tab-stop';
        pointerId: number;
        startClientX: number;
        moved: boolean;
        tabStop: ParagraphTabStop;
    };

type RulerDragHandle = RulerDragState['handle'];

export function DocumentRulerOverlay({
    width,
    height,
    margins,
    paragraphIndent = null,
    disabled = false,
    rulerMode = 'full',
    onHorizontalMarginsPreview,
    onHorizontalMarginsCommit,
    onParagraphIndentPreview,
    onParagraphIndentCommit,
    onParagraphTabStopsChange,
}: DocumentRulerOverlayProps) {
    const topRulerRef = useRef<HTMLDivElement | null>(null);
    const dragStateRef = useRef<RulerDragState | null>(null);
    const [activeDragHandle, setActiveDragHandle] = useState<RulerDragHandle | null>(null);
    const [activeTabStopKey, setActiveTabStopKey] = useState<string | null>(null);
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
            ? `${paragraphIndent.tabStops.length} typed tab stop${paragraphIndent.tabStops.length === 1 ? '' : 's'}`
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

        return normalizeParagraphTabStops(width, margins, [snapped])[0]?.position ?? null;
    }, [margins, width]);

    const resolveMovedTabStops = useCallback((pointerClientX: number, tabStop: ParagraphTabStop) => {
        if (!paragraphIndent) return null;

        const nextPosition = resolveTabStopFromPointer(pointerClientX);
        if (nextPosition === null) return null;

        return normalizeParagraphTabStops(
            width,
            margins,
            paragraphIndent.tabStops.map((value) => {
                if (value.position !== tabStop.position || value.align !== tabStop.align) {
                    return value;
                }

                return {
                    ...value,
                    position: nextPosition,
                };
            }),
        );
    }, [margins, paragraphIndent, resolveTabStopFromPointer, width]);

    const addTabStopAtPointer = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
        if (disabled || !paragraphIndent || !onParagraphTabStopsChange) return;
        if (event.target instanceof Element && event.target.closest('button')) return;

        const nextTabStop = resolveTabStopFromPointer(event.clientX);
        if (nextTabStop === null) return;

        onParagraphTabStopsChange(
            normalizeParagraphTabStops(width, margins, [
                ...paragraphIndent.tabStops,
                { position: nextTabStop, align: 'left' },
            ]),
        );
    }, [disabled, margins, onParagraphTabStopsChange, paragraphIndent, resolveTabStopFromPointer, width]);

    const updateTabStops = useCallback((tabStops: ParagraphTabStop[]) => {
        if (disabled || !paragraphIndent || !onParagraphTabStopsChange) return;

        onParagraphTabStopsChange(
            normalizeParagraphTabStops(
                width,
                margins,
                tabStops,
            ),
        );
    }, [disabled, margins, onParagraphTabStopsChange, paragraphIndent, width]);

    const removeTabStop = useCallback((tabStop: ParagraphTabStop) => {
        updateTabStops(paragraphIndent?.tabStops.filter((value) => (
            value.position !== tabStop.position || value.align !== tabStop.align
        )) ?? []);
    }, [paragraphIndent?.tabStops, updateTabStops]);

    const moveTabStop = useCallback((pointerClientX: number, tabStop: ParagraphTabStop) => {
        const nextTabStops = resolveMovedTabStops(pointerClientX, tabStop);
        if (!nextTabStops) return;

        updateTabStops(nextTabStops);
    }, [resolveMovedTabStops, updateTabStops]);

    const setTabStopAlign = useCallback((tabStop: ParagraphTabStop, align: ParagraphTabStopAlign) => {
        updateTabStops(paragraphIndent?.tabStops.map((value) => {
            if (value.position !== tabStop.position || value.align !== tabStop.align) {
                return value;
            }

            return {
                ...value,
                align,
            };
        }) ?? []);
        setActiveTabStopKey(null);
    }, [paragraphIndent?.tabStops, updateTabStops]);

    const toggleTabStopPopover = useCallback((tabStop: ParagraphTabStop) => {
        const key = getTabStopKey(tabStop);
        setActiveTabStopKey((current) => current === key ? null : key);
    }, []);

    const stopDragging = useCallback(() => {
        dragStateRef.current = null;
        setActiveDragHandle(null);
        document.body.classList.remove('document-ruler--dragging');
    }, []);

    useEffect(() => {
        if (!activeTabStopKey) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (!(event.target instanceof Element)) {
                setActiveTabStopKey(null);
                return;
            }

            if (
                event.target.closest('.document-ruler__tab-stop') ||
                event.target.closest('.document-ruler__tab-stop-popover')
            ) {
                return;
            }

            setActiveTabStopKey(null);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setActiveTabStopKey(null);
            }
        };

        window.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeTabStopKey]);

    const handlePointerMove = useCallback((event: PointerEvent) => {
        const dragState = dragStateRef.current;
        if (!dragState) return;

        if (dragState.handle === 'left' || dragState.handle === 'right') {
            const nextMargins = resolveHorizontalMargins(event.clientX, dragState.handle);
            if (!nextMargins) return;
            onHorizontalMarginsPreview?.(nextMargins);
            return;
        }

        if (dragState.handle === 'paragraph-tab-stop') {
            if (Math.abs(event.clientX - dragState.startClientX) > DRAG_CLICK_THRESHOLD_PX) {
                dragState.moved = true;
            }

            moveTabStop(event.clientX, dragState.tabStop);
            return;
        }

        const nextIndentation = resolveParagraphIndentation(event.clientX, dragState.handle);
        if (!nextIndentation) return;
        onParagraphIndentPreview?.(nextIndentation);
    }, [moveTabStop, onHorizontalMarginsPreview, onParagraphIndentPreview, resolveHorizontalMargins, resolveParagraphIndentation]);

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
        } else if (dragState.handle === 'paragraph-tab-stop') {
            if (dragState.moved) {
                moveTabStop(event.clientX, dragState.tabStop);
            } else {
                toggleTabStopPopover(dragState.tabStop);
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

    function beginTabStopDrag(event: ReactPointerEvent<HTMLButtonElement>, tabStop: ParagraphTabStop) {
        if (disabled) return;
        if (event.button !== 0) return;

        event.preventDefault();
        event.stopPropagation();

        setActiveTabStopKey(null);
        dragStateRef.current = {
            handle: 'paragraph-tab-stop',
            pointerId: event.pointerId,
            startClientX: event.clientX,
            moved: false,
            tabStop,
        };
        setActiveDragHandle('paragraph-tab-stop');
        document.body.classList.add('document-ruler--dragging');
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    }

    const verticalRuler = (
        <div className="document-ruler document-ruler--left" style={{ height }}>
            <span
                className="document-ruler__margin-zone document-ruler__margin-zone--top"
                style={{ height: `${topMarginPercent}%` }}
            />
            <span
                className="document-ruler__margin-zone document-ruler__margin-zone--bottom"
                style={{ height: `${bottomMarginPercent}%` }}
            />
            {VERTICAL_TICKS.map((tick) => {
                const tickInches = tick / 2;
                const topMarginIn = margins.top / DPI;
                const bottomMarginIn = margins.bottom / DPI;
                const inMarginZone =
                    tickInches < topMarginIn ||
                    tickInches > A4_HEIGHT_IN - bottomMarginIn;
                // Position each tick at its physical inch position, not even distribution.
                // This ensures 1 inch on the ruler == 96px, matching the paper geometry.
                const topPct = (tickInches * DPI / height) * 100;
                return (
                    <span
                        key={`left-${tick}`}
                        className={`document-ruler__tick${isMajorTick(tick) ? ' document-ruler__tick--major' : ''}`}
                        style={{ top: `${topPct}%` }}
                    >
                        {isMajorTick(tick) && !inMarginZone && (
                            <span className="document-ruler__label">{tickInches}</span>
                        )}
                    </span>
                );
            })}
        </div>
    );

    if (rulerMode === 'left-only') {
        return verticalRuler;
    }

    const horizontalRuler = (
        <div
            ref={topRulerRef}
            className={`document-ruler document-ruler--top${disabled ? ' document-ruler--disabled' : ''}`}
            title={paragraphIndent ? 'Double-click the ruler to add a left tab stop.' : undefined}
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
                    <span
                        key={getTabStopKey(tabStop)}
                        className={[
                            'document-ruler__tab-stop-wrap',
                            activeTabStopKey === getTabStopKey(tabStop) ? 'document-ruler__tab-stop-wrap--open' : '',
                        ].filter(Boolean).join(' ')}
                        style={{ left: `${((margins.left + tabStop.position) / width) * 100}%` }}
                    >
                        <button
                            type="button"
                            className={[
                                'document-ruler__tab-stop',
                                `document-ruler__tab-stop--${tabStop.align}`,
                                activeTabStopKey === getTabStopKey(tabStop) ? 'document-ruler__tab-stop--open' : '',
                                activeDragHandle === 'paragraph-tab-stop' ? 'document-ruler__tab-stop--dragging' : '',
                                paragraphIndent.hasMixedTabStops ? 'document-ruler__tab-stop--mixed' : '',
                            ].filter(Boolean).join(' ')}
                            title={`${tabStopSummary ?? getTabStopLabel(tabStop.align)} · ${getTabStopLabel(tabStop.align)} at ${pxToInches(tabStop.position)} inches · drag to move · click to choose type · double-click to remove`}
                            aria-label={`${getTabStopLabel(tabStop.align)} ${pxToInches(tabStop.position)} inches from the left margin`}
                            aria-expanded={activeTabStopKey === getTabStopKey(tabStop)}
                            disabled={disabled}
                            onPointerDown={(event) => beginTabStopDrag(event, tabStop)}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                toggleTabStopPopover(tabStop);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    toggleTabStopPopover(tabStop);
                                    return;
                                }

                                if (event.key === 'Backspace' || event.key === 'Delete') {
                                    event.preventDefault();
                                    removeTabStop(tabStop);
                                }
                            }}
                            onDoubleClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setActiveTabStopKey(null);
                                removeTabStop(tabStop);
                            }}
                        >
                            <span aria-hidden="true" className="document-ruler__tab-stop-glyph">
                                {getTabStopGlyph(tabStop.align)}
                            </span>
                            <span className="document-ruler__handle-tip">
                                {pxToInches(tabStop.position)}″ {tabStop.align}
                            </span>
                        </button>
                        {activeTabStopKey === getTabStopKey(tabStop) && (
                            <span
                                className="document-ruler__tab-stop-popover"
                                role="menu"
                                aria-label={`Choose tab type for ${pxToInches(tabStop.position)} inch tab stop`}
                            >
                                <span className="document-ruler__tab-stop-popover-kicker">Tab stop</span>
                                <span className="document-ruler__tab-stop-popover-title">
                                    {pxToInches(tabStop.position)}″ from margin
                                </span>
                                <span className="document-ruler__tab-stop-popover-grid">
                                    {TAB_STOP_ALIGN_OPTIONS.map((option) => (
                                        <button
                                            key={option.align}
                                            type="button"
                                            role="menuitemradio"
                                            aria-checked={tabStop.align === option.align}
                                            className={[
                                                'document-ruler__tab-stop-option',
                                                `document-ruler__tab-stop-option--${option.align}`,
                                                tabStop.align === option.align ? 'document-ruler__tab-stop-option--active' : '',
                                            ].filter(Boolean).join(' ')}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                setTabStopAlign(tabStop, option.align);
                                            }}
                                        >
                                            <span className="document-ruler__tab-stop-option-glyph">
                                                {getTabStopGlyph(option.align)}
                                            </span>
                                            <span>
                                                <strong>{option.label}</strong>
                                                <small>{option.description}</small>
                                            </span>
                                        </button>
                                    ))}
                                </span>
                            </span>
                        )}
                    </span>
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
    );

    if (rulerMode === 'top-only') {
        return (
            <div className="ded-sticky-ruler">
                <div className="ded-sticky-ruler__inner" style={{ width }}>
                    {horizontalRuler}
                </div>
            </div>
        );
    }

    return (
        <div className="document-ruler-overlay">
            {horizontalRuler}
            {verticalRuler}
        </div>
    );
}

// ─── Per-page ruler sidebar with scroll sync ─────────────────────────────────

interface DocumentPageRulerSidebarProps {
    /** Ref to the scrollable canvas element — used to sync ruler scroll position. */
    canvasRef: RefObject<HTMLDivElement | null>;
    pages: DocumentPaginationPage[];
    pageHeight: number;
    margins: DocumentLayoutMargins;
    disabled?: boolean;
}

/**
 * Renders one vertical ruler per page (0 → 11"), stacked inside a non-user-
 * scrollable sidebar. The sidebar's inner scroll position is kept in sync with
 * the canvas scroll via an event listener, so each page ruler stays aligned
 * with its corresponding page in the document. The user cannot scroll the
 * ruler independently — only the document canvas drives the scroll.
 */
export function DocumentPageRulerSidebar({
    canvasRef,
    pages,
    pageHeight,
    margins,
    disabled = false,
}: DocumentPageRulerSidebarProps) {
    const innerRef = useRef<HTMLDivElement | null>(null);

    // Mirror the canvas scroll position into the inner ruler strip.
    // Uses both canvas scroll events and window scroll events so the ruler
    // stays aligned regardless of which element is the scroll container.
    useEffect(() => {
        const canvas = canvasRef.current;
        const inner = innerRef.current;
        if (!canvas || !inner) return;

        function syncFromCanvas() {
            if (inner && canvas) inner.scrollTop = canvas.scrollTop;
        }

        function syncFromWindow() {
            if (inner) inner.scrollTop = window.scrollY;
        }

        canvas.addEventListener('scroll', syncFromCanvas, { passive: true });
        window.addEventListener('scroll', syncFromWindow, { passive: true });
        syncFromCanvas();

        return () => {
            canvas.removeEventListener('scroll', syncFromCanvas);
            window.removeEventListener('scroll', syncFromWindow);
        };
    }, [canvasRef]);

    const topMarginPercent = (margins.top / pageHeight) * 100;
    const bottomMarginPercent = (margins.bottom / pageHeight) * 100;
    const topMarginIn = margins.top / DPI;
    const bottomMarginIn = margins.bottom / DPI;

    // Pre-compute tick data once — shared across all page rulers.
    const ticks = VERTICAL_TICKS.map((tick) => {
        const tickInches = tick / 2;
        const inMarginZone =
            tickInches < topMarginIn ||
            tickInches > A4_HEIGHT_IN - bottomMarginIn;
        const topPct = (tickInches * DPI / pageHeight) * 100;
        return { tick, tickInches, inMarginZone, topPct };
    });

    return (
        <div
            ref={innerRef}
            className="ded-ruler-sidebar__inner"
            aria-hidden="true"
        >
            {pages.map((page) => (
                <div
                    key={page.pageNumber}
                    className={`document-ruler document-ruler--left document-ruler--page${disabled ? ' document-ruler--disabled' : ''}`}
                    style={{ height: pageHeight }}
                >
                    <span className="document-ruler__page-badge">{page.pageNumber}</span>
                    <span
                        className="document-ruler__margin-zone document-ruler__margin-zone--top"
                        style={{ height: `${topMarginPercent}%` }}
                    />
                    <span
                        className="document-ruler__margin-zone document-ruler__margin-zone--bottom"
                        style={{ height: `${bottomMarginPercent}%` }}
                    />
                    {ticks.map(({ tick, tickInches, inMarginZone, topPct }) => (
                        <span
                            key={`p${page.pageNumber}-t${tick}`}
                            className={`document-ruler__tick${isMajorTick(tick) ? ' document-ruler__tick--major' : ''}`}
                            style={{ top: `${topPct}%` }}
                        >
                            {isMajorTick(tick) && !inMarginZone && (
                                <span className="document-ruler__label">{tickInches}</span>
                            )}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}
