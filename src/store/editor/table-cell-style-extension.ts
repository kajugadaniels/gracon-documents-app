import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { mergeAttributes } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';

export const DEFAULT_TABLE_CELL_BACKGROUND = '#ffffff';
export const DEFAULT_TABLE_CELL_BORDER_COLOR = '#111827';
export const DEFAULT_TABLE_CELL_BORDER_WIDTH = 1;
export const TABLE_BORDER_SIDES = ['top', 'right', 'bottom', 'left'] as const;

export type TableBorderSide = typeof TABLE_BORDER_SIDES[number];

const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const SIDE_TO_CSS: Record<TableBorderSide, string> = {
    top: 'Top',
    right: 'Right',
    bottom: 'Bottom',
    left: 'Left',
};

export function normalizeTableCellColor(value: unknown, fallback = DEFAULT_TABLE_CELL_BORDER_COLOR) {
    if (typeof value !== 'string') return fallback;
    const color = value.trim();
    if (!color) return fallback;
    if (HEX_COLOR_RE.test(color)) return color.toLowerCase();
    if (color === 'transparent' || color.startsWith('rgb') || color.startsWith('hsl')) return color;
    return fallback;
}

export function normalizeTableCellBorderWidth(value: unknown) {
    const parsed = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? Number.parseFloat(value)
            : Number.NaN;

    if (!Number.isFinite(parsed)) return DEFAULT_TABLE_CELL_BORDER_WIDTH;
    return Math.min(12, Math.max(0, Number(parsed.toFixed(2))));
}

function readStyleValue(element: HTMLElement, property: string) {
    return element.style.getPropertyValue(property);
}

function borderColorAttribute(side: TableBorderSide) {
    return `border${SIDE_TO_CSS[side]}Color`;
}

function borderWidthAttribute(side: TableBorderSide) {
    return `border${SIDE_TO_CSS[side]}Width`;
}

export function createTableCellStyle(attributes: Record<string, unknown>) {
    const backgroundColor = normalizeTableCellColor(
        attributes.backgroundColor,
        DEFAULT_TABLE_CELL_BACKGROUND,
    );
    const styleParts = [`background-color: ${backgroundColor}`];

    TABLE_BORDER_SIDES.forEach((side) => {
        const color = normalizeTableCellColor(
            attributes[borderColorAttribute(side)],
            DEFAULT_TABLE_CELL_BORDER_COLOR,
        );
        const width = normalizeTableCellBorderWidth(attributes[borderWidthAttribute(side)]);

        styleParts.push(`border-${side}: ${width}px solid ${color}`);
    });

    return styleParts.join('; ');
}

function createStyledCellAttributes() {
    return {
        backgroundColor: {
            default: DEFAULT_TABLE_CELL_BACKGROUND,
            parseHTML: (element: HTMLElement) => (
                element.getAttribute('data-table-background-color')
                ?? readStyleValue(element, 'background-color')
                ?? DEFAULT_TABLE_CELL_BACKGROUND
            ),
            renderHTML: (attributes: Record<string, unknown>) => ({
                'data-table-background-color': normalizeTableCellColor(
                    attributes.backgroundColor,
                    DEFAULT_TABLE_CELL_BACKGROUND,
                ),
            }),
        },
        ...Object.fromEntries(TABLE_BORDER_SIDES.flatMap((side) => {
            const cssSide = SIDE_TO_CSS[side];

            return [
                [
                    borderColorAttribute(side),
                    {
                        default: DEFAULT_TABLE_CELL_BORDER_COLOR,
                        parseHTML: (element: HTMLElement) => (
                            element.getAttribute(`data-table-border-${side}-color`)
                            ?? readStyleValue(element, `border-${side}-color`)
                            ?? DEFAULT_TABLE_CELL_BORDER_COLOR
                        ),
                        renderHTML: (attributes: Record<string, unknown>) => ({
                            [`data-table-border-${side}-color`]: normalizeTableCellColor(
                                attributes[`border${cssSide}Color`],
                                DEFAULT_TABLE_CELL_BORDER_COLOR,
                            ),
                        }),
                    },
                ],
                [
                    borderWidthAttribute(side),
                    {
                        default: DEFAULT_TABLE_CELL_BORDER_WIDTH,
                        parseHTML: (element: HTMLElement) => (
                            element.getAttribute(`data-table-border-${side}-width`)
                            ?? readStyleValue(element, `border-${side}-width`)
                            ?? DEFAULT_TABLE_CELL_BORDER_WIDTH
                        ),
                        renderHTML: (attributes: Record<string, unknown>) => ({
                            [`data-table-border-${side}-width`]: String(
                                normalizeTableCellBorderWidth(attributes[`border${cssSide}Width`]),
                            ),
                        }),
                    },
                ],
            ];
        })),
    };
}

function createStyledCellExtension(tagName: 'td' | 'th') {
    return {
        addAttributes(this: { parent?: () => Record<string, unknown> }) {
            return {
                ...this.parent?.(),
                ...createStyledCellAttributes(),
            };
        },
        renderHTML(
            this: { options: { HTMLAttributes: Record<string, unknown> } },
            { HTMLAttributes }: { HTMLAttributes: Record<string, unknown> },
        ): DOMOutputSpec {
            const currentStyle = typeof HTMLAttributes.style === 'string' ? HTMLAttributes.style : '';

            return [
                tagName,
                mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                    style: [currentStyle, createTableCellStyle(HTMLAttributes)].filter(Boolean).join('; '),
                }),
                0,
            ];
        },
    };
}

export const StyledTableCell = TableCell.extend(createStyledCellExtension('td'));
export const StyledTableHeader = TableHeader.extend(createStyledCellExtension('th'));

export function tableBorderColorAttribute(side: TableBorderSide) {
    return borderColorAttribute(side);
}

export function tableBorderWidthAttribute(side: TableBorderSide) {
    return borderWidthAttribute(side);
}
