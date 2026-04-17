/**
 * Insert menu items for the document editor menu bar.
 *
 * Keep this file as the single insert-menu contract. The action dispatcher
 * imports the typed action IDs from here so menu labels and command handling
 * cannot drift silently.
 */
import type { MenuItem } from './types';

export const INSERT_ACTION_IDS = {
    image: 'insert:image',
    table: 'insert:table',
    horizontalRule: 'insert:hr',
    link: 'insert:link',
    comment: 'insert:comment',
    emoji: 'insert:emoji',
    specialCharacters: 'insert:special',
    footnote: 'insert:footnote',
    headerFooter: 'insert:header-footer',
} as const;

export type InsertActionId = typeof INSERT_ACTION_IDS[keyof typeof INSERT_ACTION_IDS];

interface InsertActionDefinition {
    actionId: InsertActionId;
    label: string;
    shortcut?: string;
    disabled?: boolean;
    /**
     * Current implementation status for planning and future enablement.
     * This is intentionally not rendered in the menu.
     */
    status: 'ready' | 'planned';
}

export const INSERT_ACTIONS = {
    image: {
        actionId: INSERT_ACTION_IDS.image,
        label: 'Image',
        disabled: true,
        status: 'planned',
    },
    table: {
        actionId: INSERT_ACTION_IDS.table,
        label: 'Table',
        status: 'ready',
    },
    horizontalRule: {
        actionId: INSERT_ACTION_IDS.horizontalRule,
        label: 'Horizontal line',
        status: 'ready',
    },
    link: {
        actionId: INSERT_ACTION_IDS.link,
        label: 'Link',
        shortcut: '⌘K',
        disabled: true,
        status: 'planned',
    },
    comment: {
        actionId: INSERT_ACTION_IDS.comment,
        label: 'Comment',
        disabled: true,
        status: 'planned',
    },
    emoji: {
        actionId: INSERT_ACTION_IDS.emoji,
        label: 'Emoji',
        disabled: true,
        status: 'planned',
    },
    specialCharacters: {
        actionId: INSERT_ACTION_IDS.specialCharacters,
        label: 'Special characters',
        disabled: true,
        status: 'planned',
    },
    footnote: {
        actionId: INSERT_ACTION_IDS.footnote,
        label: 'Footnote',
        disabled: true,
        status: 'planned',
    },
    headerFooter: {
        actionId: INSERT_ACTION_IDS.headerFooter,
        label: 'Header & footer',
        disabled: true,
        status: 'planned',
    },
} satisfies Record<string, InsertActionDefinition>;

function createInsertAction(action: InsertActionDefinition): MenuItem {
    return {
        type: 'action',
        label: action.label,
        actionId: action.actionId,
        ...(action.shortcut ? { shortcut: action.shortcut } : {}),
        ...(action.disabled ? { disabled: true } : {}),
    };
}

export const INSERT_MENU_ITEMS: MenuItem[] = [
    createInsertAction(INSERT_ACTIONS.image),
    createInsertAction(INSERT_ACTIONS.table),
    createInsertAction(INSERT_ACTIONS.horizontalRule),
    { type: 'divider' },
    createInsertAction(INSERT_ACTIONS.link),
    createInsertAction(INSERT_ACTIONS.comment),
    { type: 'divider' },
    createInsertAction(INSERT_ACTIONS.emoji),
    createInsertAction(INSERT_ACTIONS.specialCharacters),
    { type: 'divider' },
    createInsertAction(INSERT_ACTIONS.footnote),
    createInsertAction(INSERT_ACTIONS.headerFooter),
];
