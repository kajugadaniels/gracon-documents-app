/**
 * Shared geometry helpers for the draggable signed-strip overlay.
 */
import type { DocumentSignatureSnapshot } from '@/api/documents.api';

export interface Position {
    x: number;
    y: number;
}

export interface Constraints {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface DragSession {
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    containerWidth: number;
    containerHeight: number;
}

export const DEFAULT_POSITION: Position = { x: 0.57, y: 0.78 };
export const DEFAULT_CONSTRAINTS: Constraints = {
    minX: 0,
    maxX: 1,
    minY: 0,
    maxY: 1,
};

const CONTENT_GAP_PX = 18;
const POSITION_EPSILON = 0.0005;

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

export function clampPosition(position: Position, constraints: Constraints): Position {
    return {
        x: clamp(position.x, constraints.minX, constraints.maxX),
        y: clamp(position.y, constraints.minY, constraints.maxY),
    };
}

export function positionsEqual(a: Position, b: Position) {
    return Math.abs(a.x - b.x) < POSITION_EPSILON
        && Math.abs(a.y - b.y) < POSITION_EPSILON;
}

export function getPersistedPosition(snapshot: DocumentSignatureSnapshot | null): Position {
    return {
        x: snapshot?.x ?? DEFAULT_POSITION.x,
        y: snapshot?.y ?? DEFAULT_POSITION.y,
    };
}

export function measureConstraints(
    overlayEl: HTMLDivElement,
    cardEl: HTMLDivElement,
): Constraints {
    const overlayRect = overlayEl.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();
    if (overlayRect.width === 0 || overlayRect.height === 0) {
        return DEFAULT_CONSTRAINTS;
    }

    const maxX = Math.max(0, (overlayRect.width - cardRect.width) / overlayRect.width);
    const maxY = Math.max(0, (overlayRect.height - cardRect.height) / overlayRect.height);
    const paperEl = overlayEl.closest('.document-paper-sheet');
    const contentEl = paperEl?.querySelector('.ProseMirror') as HTMLElement | null;

    let minY = 0;
    if (contentEl) {
        const contentRect = contentEl.getBoundingClientRect();
        const floorPx = Math.max(0, contentRect.bottom - overlayRect.top + CONTENT_GAP_PX);
        minY = clamp(floorPx / overlayRect.height, 0, maxY);
    }

    return { minX: 0, maxX, minY, maxY };
}
