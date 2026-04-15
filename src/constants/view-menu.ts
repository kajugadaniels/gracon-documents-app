import type { MenuItem } from './types';

export interface DocumentViewMenuState {
    printLayout: boolean;
    canToggleMode: boolean;
    viewMode: 'editing' | 'viewing';
    zoom: number;
    isFullscreen: boolean;
    showRuler: boolean;
    showFormattingMarks: boolean;
}

function withCheckmark(enabled: boolean, label: string) {
    return enabled ? `✓ ${label}` : label;
}

export function buildViewMenuItems(state: DocumentViewMenuState): MenuItem[] {
    return [
        {
            type: 'action',
            label: withCheckmark(state.printLayout, 'Print layout'),
            actionId: 'view:print-layout',
        },
        {
            type: 'action',
            label: state.canToggleMode
                ? withCheckmark(state.viewMode === 'editing', 'Mode: Editing')
                : 'Mode: View only',
            actionId: 'view:toggle-mode',
            disabled: !state.canToggleMode,
        },
        { type: 'divider' },
        {
            type: 'action',
            label: 'Zoom in',
            actionId: 'view:zoom-in',
            shortcut: '⌘+',
            disabled: state.zoom >= 200,
        },
        {
            type: 'action',
            label: 'Zoom out',
            actionId: 'view:zoom-out',
            shortcut: '⌘-',
            disabled: state.zoom <= 50,
        },
        {
            type: 'action',
            label: `Reset zoom (${state.zoom}%)`,
            actionId: 'view:zoom-reset',
            disabled: state.zoom === 100,
        },
        {
            type: 'action',
            label: state.isFullscreen ? 'Exit full screen' : 'Full screen',
            actionId: 'view:fullscreen',
        },
        { type: 'divider' },
        {
            type: 'action',
            label: withCheckmark(state.showRuler, 'Show ruler'),
            actionId: 'view:ruler',
        },
        {
            type: 'action',
            label: withCheckmark(state.showFormattingMarks, 'Show formatting marks'),
            actionId: 'view:marks',
        },
    ];
}

export const VIEW_MENU_ITEMS = buildViewMenuItems({
    printLayout: true,
    canToggleMode: true,
    viewMode: 'editing',
    zoom: 100,
    isFullscreen: false,
    showRuler: false,
    showFormattingMarks: false,
});
