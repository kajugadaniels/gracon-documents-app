/**
 * Curated list of popular Google Fonts for the document editor font picker.
 * Each entry maps to a valid Google Fonts family name.
 * Loaded on-demand via a dynamic <link> injection when selected.
 */

export interface GoogleFont {
    /** Display name shown in the font picker. */
    label: string;
    /** CSS font-family value (exact Google Fonts name). */
    value: string;
    /** Category for grouping: serif, sans-serif, monospace, display, handwriting. */
    category: 'serif' | 'sans-serif' | 'monospace' | 'display' | 'handwriting';
}

export const GOOGLE_FONTS: GoogleFont[] = [
    // ─── Sans-serif ───────────────────────────────────────────────
    { label: 'Inter',          value: 'Inter',           category: 'sans-serif' },
    { label: 'Roboto',         value: 'Roboto',          category: 'sans-serif' },
    { label: 'Open Sans',      value: 'Open Sans',       category: 'sans-serif' },
    { label: 'Lato',           value: 'Lato',            category: 'sans-serif' },
    { label: 'Noto Sans',      value: 'Noto Sans',       category: 'sans-serif' },
    { label: 'Nunito',         value: 'Nunito',          category: 'sans-serif' },
    { label: 'Poppins',        value: 'Poppins',         category: 'sans-serif' },
    { label: 'Raleway',        value: 'Raleway',         category: 'sans-serif' },
    { label: 'Source Sans 3',  value: 'Source Sans 3',   category: 'sans-serif' },
    { label: 'DM Sans',        value: 'DM Sans',         category: 'sans-serif' },

    // ─── Serif ────────────────────────────────────────────────────
    { label: 'Merriweather',   value: 'Merriweather',    category: 'serif' },
    { label: 'Playfair Display', value: 'Playfair Display', category: 'serif' },
    { label: 'Lora',           value: 'Lora',            category: 'serif' },
    { label: 'EB Garamond',    value: 'EB Garamond',     category: 'serif' },
    { label: 'Noto Serif',     value: 'Noto Serif',      category: 'serif' },
    { label: 'Libre Baskerville', value: 'Libre Baskerville', category: 'serif' },

    // ─── Monospace ────────────────────────────────────────────────
    { label: 'JetBrains Mono', value: 'JetBrains Mono',  category: 'monospace' },
    { label: 'Source Code Pro', value: 'Source Code Pro', category: 'monospace' },
    { label: 'Roboto Mono',    value: 'Roboto Mono',     category: 'monospace' },
    { label: 'Fira Code',      value: 'Fira Code',       category: 'monospace' },
    { label: 'Space Mono',     value: 'Space Mono',      category: 'monospace' },

    // ─── Display ──────────────────────────────────────────────────
    { label: 'Oswald',         value: 'Oswald',          category: 'display' },
    { label: 'Bebas Neue',     value: 'Bebas Neue',      category: 'display' },
    { label: 'Exo 2',          value: 'Exo 2',           category: 'display' },

    // ─── Handwriting ──────────────────────────────────────────────
    { label: 'Dancing Script', value: 'Dancing Script',  category: 'handwriting' },
    { label: 'Caveat',         value: 'Caveat',          category: 'handwriting' },
    { label: 'Pacifico',       value: 'Pacifico',        category: 'handwriting' },
];

/** Common document font sizes in points. */
export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72] as const;

/**
 * Dynamically injects a Google Fonts <link> for the given family if not already present.
 * Safe to call multiple times for the same family — inserts only once.
 */
export function loadGoogleFont(family: string): void {
    if (typeof document === 'undefined') return;
    const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
    document.head.appendChild(link);
}
