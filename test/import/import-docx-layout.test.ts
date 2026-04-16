import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    collectImportedParagraphLayouts,
    createImportedParagraphLayout,
    twipToPx,
} from '../../src/lib/import-docx-layout.ts';

describe('DOCX import layout conversion', () => {
    it('converts Word twips to CSS pixels', () => {
        assert.equal(twipToPx('720'), 48);
        assert.equal(twipToPx(360), 24);
        assert.equal(twipToPx('invalid'), 0);
    });

    it('maps paragraph indents into editor ruler attributes', () => {
        const layout = createImportedParagraphLayout({
            type: 'paragraph',
            indent: {
                start: '720',
                firstLine: '360',
            },
        });

        assert.deepEqual(layout, {
            leftIndent: 48,
            firstLineIndent: 24,
            tabStops: [],
        });
    });

    it('maps hanging indents into negative first-line indentation', () => {
        const layout = createImportedParagraphLayout({
            type: 'paragraph',
            indent: {
                left: '1080',
                hanging: '360',
            },
        });

        assert.deepEqual(layout, {
            leftIndent: 72,
            firstLineIndent: -24,
            tabStops: [],
        });
    });

    it('normalizes future Mammoth tab-stop metadata when present', () => {
        const layout = createImportedParagraphLayout({
            type: 'paragraph',
            indent: { start: '0' },
            tabStops: [
                { position: '720' },
                { position: '1430' },
                { position: '1440' },
                { position: '20000' },
            ],
        });

        assert.deepEqual(layout.tabStops, [48, 96, 602]);
    });

    it('collects one layout entry for every Mammoth paragraph in document order', () => {
        const layouts = collectImportedParagraphLayouts({
            type: 'document',
            children: [
                {
                    type: 'paragraph',
                    indent: { start: '720' },
                    children: [{ type: 'run', children: [] }],
                },
                {
                    type: 'table',
                    children: [
                        {
                            type: 'tableRow',
                            children: [
                                {
                                    type: 'tableCell',
                                    children: [
                                        {
                                            type: 'paragraph',
                                            indent: { hanging: '360' },
                                            children: [],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        assert.deepEqual(layouts, [
            { leftIndent: 48, firstLineIndent: 0, tabStops: [] },
            { leftIndent: 0, firstLineIndent: -24, tabStops: [] },
        ]);
    });
});
