'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { toast } from '@/components/ui';

export type DocumentViewMode = 'editing' | 'viewing';

export interface DocumentViewState {
    printLayout: boolean;
    viewMode: DocumentViewMode;
    zoom: number;
    showRuler: boolean;
    showFormattingMarks: boolean;
    isFullscreen: boolean;
}

interface UseDocumentViewStateOptions {
    canToggleMode: boolean;
    fullscreenTargetRef: RefObject<HTMLElement | null>;
}

const STORAGE_KEY = 'documents:view-preferences';
const DEFAULT_VIEW_STATE: DocumentViewState = {
    printLayout: true,
    viewMode: 'editing',
    zoom: 100,
    showRuler: false,
    showFormattingMarks: false,
    isFullscreen: false,
};

function clampZoom(zoom: number) {
    return Math.min(200, Math.max(50, Math.round(zoom)));
}

function parseStoredState(raw: string | null): Partial<DocumentViewState> | null {
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as Partial<DocumentViewState>;
        return {
            printLayout: typeof parsed.printLayout === 'boolean' ? parsed.printLayout : undefined,
            viewMode: parsed.viewMode === 'viewing' ? 'viewing' : 'editing',
            zoom: typeof parsed.zoom === 'number' ? clampZoom(parsed.zoom) : undefined,
            showRuler: typeof parsed.showRuler === 'boolean' ? parsed.showRuler : undefined,
            showFormattingMarks: typeof parsed.showFormattingMarks === 'boolean'
                ? parsed.showFormattingMarks
                : undefined,
        };
    } catch {
        return null;
    }
}

export function useDocumentViewState({
    canToggleMode,
    fullscreenTargetRef,
}: UseDocumentViewStateOptions) {
    const [state, setState] = useState<DocumentViewState>(() => {
        if (typeof window === 'undefined') {
            return DEFAULT_VIEW_STATE;
        }

        const stored = parseStoredState(window.sessionStorage.getItem(STORAGE_KEY));

        return {
            ...DEFAULT_VIEW_STATE,
            ...stored,
            viewMode: stored?.viewMode ?? 'editing',
            isFullscreen: Boolean(document.fullscreenElement),
        };
    });

    useEffect(() => {
        const persistedState = {
            ...state,
            viewMode: canToggleMode ? state.viewMode : 'editing',
        };
        const { isFullscreen, ...serializableState } = persistedState;
        void isFullscreen;
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializableState));
    }, [canToggleMode, state]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setState((current) => ({
                ...current,
                isFullscreen: Boolean(document.fullscreenElement),
            }));
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const handleViewAction = useCallback((actionId: string) => {
        switch (actionId) {
            case 'view:print-layout':
                setState((current) => ({ ...current, printLayout: !current.printLayout }));
                return;

            case 'view:toggle-mode':
                if (!canToggleMode) return;
                setState((current) => ({
                    ...current,
                    viewMode: current.viewMode === 'editing' ? 'viewing' : 'editing',
                }));
                return;

            case 'view:zoom-in':
                setState((current) => ({ ...current, zoom: clampZoom(current.zoom + 10) }));
                return;

            case 'view:zoom-out':
                setState((current) => ({ ...current, zoom: clampZoom(current.zoom - 10) }));
                return;

            case 'view:zoom-reset':
                setState((current) => ({ ...current, zoom: 100 }));
                return;

            case 'view:ruler':
                setState((current) => ({ ...current, showRuler: !current.showRuler }));
                return;

            case 'view:marks':
                setState((current) => ({
                    ...current,
                    showFormattingMarks: !current.showFormattingMarks,
                }));
                return;

            case 'view:fullscreen':
                if (document.fullscreenElement) {
                    void document.exitFullscreen().catch(() => {
                        toast.error('Unable to exit full screen right now.');
                    });
                    return;
                }

                if (!document.fullscreenEnabled) {
                    toast.warning('Full screen is not available in this browser.');
                    return;
                }

                const target = fullscreenTargetRef.current;
                if (!target) return;

                void target.requestFullscreen().catch(() => {
                    toast.error('Unable to enter full screen right now.');
                });
                return;
        }
    }, [canToggleMode, fullscreenTargetRef]);

    return {
        viewState: {
            ...state,
            viewMode: canToggleMode ? state.viewMode : 'editing',
        },
        handleViewAction,
    };
}
