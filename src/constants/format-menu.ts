/**
 * Format menu items for the document editor menu bar.
 * Text formatting actions dispatch to live editor commands.
 */
import type { MenuItem } from './types';

export const FORMAT_MENU_ITEMS: MenuItem[] = [
    { type: 'action', label: 'Bold',             actionId: 'format:bold',       shortcut: '⌘B' },
    { type: 'action', label: 'Italic',           actionId: 'format:italic',     shortcut: '⌘I' },
    { type: 'action', label: 'Underline',        actionId: 'format:underline',  shortcut: '⌘U' },
    { type: 'action', label: 'Strikethrough',    actionId: 'format:strike' },
    { type: 'action', label: 'Highlight',        actionId: 'format:highlight' },
    { type: 'divider' },
    { type: 'action', label: 'Paragraph styles', actionId: 'format:paragraph',  disabled: true },
    { type: 'action', label: 'Align & indent',   actionId: 'format:align',      disabled: true },
    { type: 'action', label: 'Line spacing',     actionId: 'format:spacing',    disabled: true },
    { type: 'divider' },
    { type: 'action', label: 'Bullets & numbering', actionId: 'format:lists',   disabled: true },
    { type: 'divider' },
    { type: 'action', label: 'Clear formatting', actionId: 'format:clear',      shortcut: '⌘\\' },
];
