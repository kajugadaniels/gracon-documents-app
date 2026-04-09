/**
 * Insert menu items for the document editor menu bar.
 * Image, table, and link inserts partially wire to live editor commands.
 */
import type { MenuItem } from './types';

export const INSERT_MENU_ITEMS: MenuItem[] = [
    { type: 'action', label: 'Image',            actionId: 'insert:image',    disabled: true },
    { type: 'action', label: 'Table',            actionId: 'insert:table' },
    { type: 'action', label: 'Horizontal line',  actionId: 'insert:hr' },
    { type: 'divider' },
    { type: 'action', label: 'Link',             actionId: 'insert:link',     shortcut: '⌘K', disabled: true },
    { type: 'action', label: 'Comment',          actionId: 'insert:comment',  disabled: true },
    { type: 'divider' },
    { type: 'action', label: 'Emoji',            actionId: 'insert:emoji',    disabled: true },
    { type: 'action', label: 'Special characters', actionId: 'insert:special', disabled: true },
    { type: 'divider' },
    { type: 'action', label: 'Footnote',         actionId: 'insert:footnote', disabled: true },
    { type: 'action', label: 'Header & footer',  actionId: 'insert:header-footer', disabled: true },
];
