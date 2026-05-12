/**
 * Preserves safe DOCX layout styles that do not yet have dedicated editor attrs.
 */
import { Extension } from '@tiptap/core';

const SAFE_STYLE_PROPERTIES = new Set([
    'background-color',
    'border',
    'border-bottom',
    'border-left',
    'border-right',
    'border-top',
    'line-height',
    'margin-bottom',
    'margin-top',
    'padding',
    'padding-bottom',
    'padding-left',
    'padding-right',
    'padding-top',
    'text-align',
]);

function sanitizeStyleValue(value: string) {
    const trimmed = value.trim();

    if (!trimmed || /url\s*\(|expression\s*\(|javascript:/i.test(trimmed)) {
        return '';
    }

    return trimmed;
}

/**
 * Keeps only safe, layout-oriented CSS declarations from imported DOCX HTML.
 *
 * @param style - Raw inline CSS from the imported HTML.
 * @returns A normalized style string that is safe to persist in editor JSON.
 */
export function sanitizeImportedDocxStyle(style: string | null) {
    if (!style) return null;

    const declarations = style
        .split(';')
        .map((declaration) => declaration.trim())
        .filter(Boolean)
        .flatMap((declaration) => {
            const separatorIndex = declaration.indexOf(':');
            if (separatorIndex <= 0) return [];

            const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
            const value = sanitizeStyleValue(declaration.slice(separatorIndex + 1));

            if (!SAFE_STYLE_PROPERTIES.has(property) || !value) return [];
            return [`${property}: ${value}`];
        });

    return declarations.length > 0 ? declarations.join('; ') : null;
}

function parseImportedStyle(element: HTMLElement) {
    return sanitizeImportedDocxStyle(
        element.getAttribute('data-imported-docx-style') || element.getAttribute('style'),
    );
}

export const ImportedDocxStyleExtension = Extension.create({
    name: 'importedDocxStyle',

    addGlobalAttributes() {
        return [
            {
                types: ['paragraph', 'heading', 'tableCell', 'tableHeader'],
                attributes: {
                    importedDocxStyle: {
                        default: null,
                        parseHTML: parseImportedStyle,
                        renderHTML: (attributes) => {
                            const style = sanitizeImportedDocxStyle(
                                typeof attributes.importedDocxStyle === 'string'
                                    ? attributes.importedDocxStyle
                                    : null,
                            );

                            if (!style) return {};

                            return {
                                'data-imported-docx-style': style,
                                style,
                            };
                        },
                    },
                },
            },
        ];
    },
});
