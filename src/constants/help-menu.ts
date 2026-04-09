/**
 * Help menu items for the document editor menu bar.
 * All items are currently display-only (dummy).
 */
import type { MenuItem } from './types';

export const HELP_MENU_ITEMS: MenuItem[] = [
    { type: 'action', label: 'Search the menus',  actionId: 'help:search',   shortcut: '⌥/', disabled: true },
    { type: 'divider' },
    { type: 'action', label: 'Help',              actionId: 'help:docs',     disabled: true },
    { type: 'action', label: 'Keyboard shortcuts', actionId: 'help:shortcuts', shortcut: '⌘/', disabled: true },
    { type: 'divider' },
    { type: 'action', label: 'Report an issue',   actionId: 'help:report',   disabled: true },
    { type: 'action', label: 'About',             actionId: 'help:about',    disabled: true },
];
