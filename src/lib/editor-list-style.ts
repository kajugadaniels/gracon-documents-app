import type { BulletListStyle, OrderedListStyle } from '../constants/list-styles';

const DEFAULT_BULLET_LIST_STYLE: BulletListStyle = 'disc';
const DEFAULT_ORDERED_LIST_STYLE: OrderedListStyle = 'decimal';
const BULLET_LIST_STYLES = ['disc', 'circle', 'square'] as const;
const ORDERED_LIST_STYLES = ['decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'] as const;

function normalizeBulletListStyle(value: unknown): BulletListStyle {
    return typeof value === 'string' && BULLET_LIST_STYLES.includes(value as BulletListStyle)
        ? value as BulletListStyle
        : DEFAULT_BULLET_LIST_STYLE;
}

function normalizeOrderedListStyle(value: unknown): OrderedListStyle {
    return typeof value === 'string' && ORDERED_LIST_STYLES.includes(value as OrderedListStyle)
        ? value as OrderedListStyle
        : DEFAULT_ORDERED_LIST_STYLE;
}

export const BULLET_LIST_REFERENCE_BY_STYLE = {
    disc: 'bullet-list-disc',
    circle: 'bullet-list-circle',
    square: 'bullet-list-square',
} as const satisfies Record<BulletListStyle, string>;

export const ORDERED_LIST_REFERENCE_BY_STYLE = {
    decimal: 'ordered-list-decimal',
    'lower-alpha': 'ordered-list-lower-alpha',
    'upper-alpha': 'ordered-list-upper-alpha',
    'lower-roman': 'ordered-list-lower-roman',
    'upper-roman': 'ordered-list-upper-roman',
} as const satisfies Record<OrderedListStyle, string>;

function getRawListStyleType(element: HTMLElement) {
    return element.getAttribute('data-list-style-type') || element.style.listStyleType;
}

export function readBulletListStyleFromElement(element: HTMLElement): BulletListStyle {
    return normalizeBulletListStyle(getRawListStyleType(element) || DEFAULT_BULLET_LIST_STYLE);
}

export function readOrderedListStyleFromElement(element: HTMLElement): OrderedListStyle {
    return normalizeOrderedListStyle(getRawListStyleType(element) || DEFAULT_ORDERED_LIST_STYLE);
}

export function getBulletListReference(style: unknown) {
    return BULLET_LIST_REFERENCE_BY_STYLE[normalizeBulletListStyle(style)];
}

export function getOrderedListReference(style: unknown) {
    return ORDERED_LIST_REFERENCE_BY_STYLE[normalizeOrderedListStyle(style)];
}

export function getListReferenceForElement(element: HTMLElement) {
    if (element.tagName === 'OL') {
        return getOrderedListReference(readOrderedListStyleFromElement(element));
    }

    return getBulletListReference(readBulletListStyleFromElement(element));
}
