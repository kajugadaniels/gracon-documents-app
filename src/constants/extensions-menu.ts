/**
 * Extensions menu items for the document editor menu bar.
 * All items are currently display-only (dummy).
 */
import type { MenuItem } from './types';

export const EXTENSIONS_MENU_ITEMS: MenuItem[] = [
    { type: 'action', label: 'Add-ons',          actionId: 'ext:addons',   disabled: true },
    { type: 'action', label: 'Manage extensions', actionId: 'ext:manage',   disabled: true },
    { type: 'divider' },
    { type: 'action', label: 'Apps Script',      actionId: 'ext:script',   disabled: true },
];
