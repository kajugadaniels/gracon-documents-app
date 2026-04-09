/**
 * File menu items for the document editor menu bar.
 * Actions prefixed with "file:" are handled by the editor action dispatcher.
 */
import type { MenuItem } from './types';

export const FILE_MENU_ITEMS: MenuItem[] = [
    { type: 'action', label: 'New document',     actionId: 'file:new' },
    { type: 'action', label: 'Open',             actionId: 'file:open' },
    { type: 'divider' },
    { type: 'action', label: 'Rename',           actionId: 'file:rename' },
    { type: 'action', label: 'Make a copy',      actionId: 'file:copy' },
    { type: 'divider' },
    { type: 'action', label: 'Download',         actionId: 'file:download' },
    { type: 'action', label: 'Export as PDF',    actionId: 'file:export-pdf' },
    { type: 'divider' },
    { type: 'action', label: 'Version history',  actionId: 'file:history', disabled: true },
    { type: 'divider' },
    { type: 'action', label: 'Print',            actionId: 'file:print',   shortcut: '⌘P' },
];
