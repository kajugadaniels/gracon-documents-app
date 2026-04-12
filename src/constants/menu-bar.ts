/**
 * MENU_BAR
 *
 * Ordered list of top-level menus displayed in the document editor header strip.
 * Each entry maps a display label to its corresponding menu items constant.
 * Consumed by DocEditorHeader to render the MenuDropdown components.
 */
import { FILE_MENU_ITEMS } from './file-menu';
import { EDIT_MENU_ITEMS } from './edit-menu';
import { VIEW_MENU_ITEMS } from './view-menu';
import { INSERT_MENU_ITEMS } from './insert-menu';
import { FORMAT_MENU_ITEMS } from './format-menu';
import { TOOLS_MENU_ITEMS } from './tools-menu';
import { EXTENSIONS_MENU_ITEMS } from './extensions-menu';
import { HELP_MENU_ITEMS } from './help-menu';

export const MENU_BAR = [
    { label: 'File',       items: FILE_MENU_ITEMS },
    { label: 'Edit',       items: EDIT_MENU_ITEMS },
    { label: 'View',       items: VIEW_MENU_ITEMS },
    { label: 'Insert',     items: INSERT_MENU_ITEMS },
    { label: 'Format',     items: FORMAT_MENU_ITEMS },
    { label: 'Tools',      items: TOOLS_MENU_ITEMS },
    { label: 'Extensions', items: EXTENSIONS_MENU_ITEMS },
    { label: 'Help',       items: HELP_MENU_ITEMS },
] as const;
