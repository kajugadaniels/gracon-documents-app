/**
 * Controlled list style options for the rich-text document editor.
 *
 * These values intentionally mirror CSS `list-style-type` identifiers so the
 * editor schema, toolbar state, rendered canvas, and export/import mappings can
 * share one durable contract.
 */

export const BULLET_LIST_STYLE_VALUES = ['disc', 'circle', 'square'] as const;
export const ORDERED_LIST_STYLE_VALUES = [
    'decimal',
    'lower-alpha',
    'upper-alpha',
    'lower-roman',
    'upper-roman',
] as const;

export type BulletListStyle = typeof BULLET_LIST_STYLE_VALUES[number];
export type OrderedListStyle = typeof ORDERED_LIST_STYLE_VALUES[number];
export type EditorListStyle = BulletListStyle | OrderedListStyle;
export type EditorListKind = 'bulletList' | 'orderedList';

export interface EditorListStyleOption<TStyle extends EditorListStyle = EditorListStyle> {
    value: TStyle;
    label: string;
    markerPreview: string;
}

export const DEFAULT_BULLET_LIST_STYLE: BulletListStyle = 'disc';
export const DEFAULT_ORDERED_LIST_STYLE: OrderedListStyle = 'decimal';

export const BULLET_LIST_STYLE_OPTIONS = [
    { value: 'disc', label: 'Disc', markerPreview: 'disc' },
    { value: 'circle', label: 'Circle', markerPreview: 'circle' },
    { value: 'square', label: 'Square', markerPreview: 'square' },
] as const satisfies readonly EditorListStyleOption<BulletListStyle>[];

export const ORDERED_LIST_STYLE_OPTIONS = [
    { value: 'decimal', label: 'Decimal', markerPreview: '1.' },
    { value: 'lower-alpha', label: 'Lower alpha', markerPreview: 'a.' },
    { value: 'upper-alpha', label: 'Upper alpha', markerPreview: 'A.' },
    { value: 'lower-roman', label: 'Lower roman', markerPreview: 'i.' },
    { value: 'upper-roman', label: 'Upper roman', markerPreview: 'I.' },
] as const satisfies readonly EditorListStyleOption<OrderedListStyle>[];

export const LIST_STYLE_OPTIONS_BY_KIND = {
    bulletList: BULLET_LIST_STYLE_OPTIONS,
    orderedList: ORDERED_LIST_STYLE_OPTIONS,
} as const satisfies Record<EditorListKind, readonly EditorListStyleOption[]>;

export function isBulletListStyle(value: unknown): value is BulletListStyle {
    return typeof value === 'string'
        && BULLET_LIST_STYLE_VALUES.includes(value as BulletListStyle);
}

export function isOrderedListStyle(value: unknown): value is OrderedListStyle {
    return typeof value === 'string'
        && ORDERED_LIST_STYLE_VALUES.includes(value as OrderedListStyle);
}

export function normalizeBulletListStyle(value: unknown): BulletListStyle {
    return isBulletListStyle(value) ? value : DEFAULT_BULLET_LIST_STYLE;
}

export function normalizeOrderedListStyle(value: unknown): OrderedListStyle {
    return isOrderedListStyle(value) ? value : DEFAULT_ORDERED_LIST_STYLE;
}
