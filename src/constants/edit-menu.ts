/**
 * Edit menu items for the document editor menu bar.
 * Undo/Redo and clipboard actions dispatch to live editor commands.
 */
import type { MenuItem } from './types';

export const EDIT_MENU_ITEMS: MenuItem[] = [
    { type: 'action', label: 'Undo',            actionId: 'edit:undo',        shortcut: '⌘Z' },
    { type: 'action', label: 'Redo',            actionId: 'edit:redo',        shortcut: '⌘⇧Z' },
    { type: 'divider' },
    { type: 'action', label: 'Cut',             actionId: 'edit:cut',         shortcut: '⌘X' },
    { type: 'action', label: 'Copy',            actionId: 'edit:copy',        shortcut: '⌘C' },
    { type: 'action', label: 'Paste',           actionId: 'edit:paste',       shortcut: '⌘V' },
    { type: 'action', label: 'Select all',      actionId: 'edit:select-all',  shortcut: '⌘A' },
    { type: 'divider' },
    { type: 'action', label: 'Find',             actionId: 'edit:find',       shortcut: '⌘F' },
];
