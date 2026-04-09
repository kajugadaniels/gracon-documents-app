/**
 * Tools menu items for the document editor menu bar.
 * All items are currently display-only (dummy).
 */
import type { MenuItem } from './types';

export const TOOLS_MENU_ITEMS: MenuItem[] = [
    { type: 'action', label: 'Spelling and grammar', actionId: 'tools:spell',     shortcut: '⌘⇧X', disabled: true },
    { type: 'action', label: 'Word count',            actionId: 'tools:word-count',                  disabled: true },
    { type: 'divider' },
    { type: 'action', label: 'Review suggested edits', actionId: 'tools:review',                     disabled: true },
    { type: 'divider' },
    { type: 'action', label: 'Preferences',           actionId: 'tools:prefs',                       disabled: true },
    { type: 'action', label: 'Accessibility settings', actionId: 'tools:a11y',                       disabled: true },
];
