/**
 * Shared type definitions for menu and toolbar constant structures.
 * All menu constants across the editor follow this contract.
 */

/** A clickable menu action with an optional keyboard shortcut. */
export interface MenuItemAction {
    type: 'action';
    label: string;
    /** Keyboard shortcut displayed on the right (display-only). */
    shortcut?: string;
    /** Identifier dispatched to the action handler. */
    actionId: string;
    disabled?: boolean;
}

/** A visual divider between groups of menu items. */
export interface MenuItemDivider {
    type: 'divider';
}

export type MenuItem = MenuItemAction | MenuItemDivider;
