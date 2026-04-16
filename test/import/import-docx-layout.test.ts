import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    collectImportedParagraphLayouts,
    createImportedParagraphLayout,
    extractParagraphTabStopsFromDocumentXml,
    mergeParagraphTabStopsIntoLayouts,
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

    it('extracts exact paragraph tab stops from DOCX document XML', () => {
        const tabStops = extractParagraphTabStopsFromDocumentXml(`
            <w:document>
                <w:body>
                    <w:p>
                        <w:pPr>
                            <w:tabs>
                                <w:tab w:val="left" w:pos="720"/>
                                <w:tab w:val="left" w:pos="1440"/>
                            </w:tabs>
                        </w:pPr>
                        <w:r><w:t>First</w:t></w:r>
                    </w:p>
                    <w:p>
                        <w:pPr>
                            <w:tabs>
                                <w:tab w:val="center" w:pos="2160"/>
                                <w:tab w:val="left" w:pos="2880"/>
                            </w:tabs>
                        </w:pPr>
                    </w:p>
                    <w:p><w:r><w:t>No tabs</w:t></w:r></w:p>
                </w:body>
            </w:document>
        `);

        assert.deepEqual(tabStops, [[48, 96], [192], []]);
    });

    it('merges raw DOCX tab stops into Mammoth paragraph layouts by paragraph order', () => {
        const layouts = mergeParagraphTabStopsIntoLayouts(
            [
                { leftIndent: 48, firstLineIndent: 0, tabStops: [] },
                { leftIndent: 0, firstLineIndent: -24, tabStops: [] },
            ],
            [
                [48, 96],
                [],
            ],
        );

        assert.deepEqual(layouts, [
            { leftIndent: 48, firstLineIndent: 0, tabStops: [48, 96] },
            { leftIndent: 0, firstLineIndent: -24, tabStops: [] },
        ]);
    });
});
