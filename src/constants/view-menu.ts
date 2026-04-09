/**
 * View menu items for the document editor menu bar.
 * All items are currently display-only (dummy).
 */
import type { MenuItem } from './types';

export const VIEW_MENU_ITEMS: MenuItem[] = [
    { type: 'action', label: 'Print layout',         actionId: 'view:print-layout',   disabled: true },
    { type: 'action', label: 'Mode: Editing',        actionId: 'view:mode-editing',   disabled: true },
    { type: 'divider' },
    { type: 'action', label: 'Zoom in',              actionId: 'view:zoom-in',        shortcut: '⌘+', disabled: true },
    { type: 'action', label: 'Zoom out',             actionId: 'view:zoom-out',       shortcut: '⌘-', disabled: true },
    { type: 'action', label: 'Full screen',          actionId: 'view:fullscreen',     disabled: true },
    { type: 'divider' },
    { type: 'action', label: 'Show ruler',           actionId: 'view:ruler',          disabled: true },
    { type: 'action', label: 'Show formatting marks', actionId: 'view:marks',         disabled: true },
];
