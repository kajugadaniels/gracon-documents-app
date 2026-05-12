import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    annotateImportedDocxHtml,
    collectImportedParagraphLayouts,
    createImportedParagraphLayout,
    extractParagraphListStylesFromDocxXml,
    extractParagraphStylesFromDocxXml,
    extractParagraphTabStopsFromDocumentXml,
    extractTableCellStylesFromDocxXml,
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

        assert.deepEqual(layout.tabStops, [
            { position: 48, align: 'left' },
            { position: 96, align: 'left' },
            { position: 602, align: 'left' },
        ]);
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
                                <w:tab w:val="right" w:pos="2880"/>
                                <w:tab w:val="decimal" w:pos="3600"/>
                            </w:tabs>
                        </w:pPr>
                    </w:p>
                    <w:p><w:r><w:t>No tabs</w:t></w:r></w:p>
                </w:body>
            </w:document>
        `);

        assert.deepEqual(tabStops, [
            [
                { position: 48, align: 'left' },
                { position: 96, align: 'left' },
            ],
            [
                { position: 144, align: 'center' },
                { position: 192, align: 'right' },
                { position: 240, align: 'decimal' },
            ],
            [],
        ]);
    });

    it('merges raw DOCX tab stops into Mammoth paragraph layouts by paragraph order', () => {
        const layouts = mergeParagraphTabStopsIntoLayouts(
            [
                { leftIndent: 48, firstLineIndent: 0, tabStops: [] },
                { leftIndent: 0, firstLineIndent: -24, tabStops: [] },
            ],
            [
                [
                    { position: 48, align: 'left' },
                    { position: 96, align: 'right' },
                ],
                [],
            ],
        );

        assert.deepEqual(layouts, [
            {
                leftIndent: 48,
                firstLineIndent: 0,
                tabStops: [
                    { position: 48, align: 'left' },
                    { position: 96, align: 'right' },
                ],
            },
            { leftIndent: 0, firstLineIndent: -24, tabStops: [] },
        ]);
    });

    it('extracts DOCX numbering formats for imported list styles', () => {
        const numberingXml = `
            <w:numbering>
                <w:abstractNum w:abstractNumId="1">
                    <w:lvl w:ilvl="0"><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%1."/></w:lvl>
                </w:abstractNum>
                <w:abstractNum w:abstractNumId="2">
                    <w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="▪"/></w:lvl>
                </w:abstractNum>
                <w:num w:numId="10"><w:abstractNumId w:val="1"/></w:num>
                <w:num w:numId="20"><w:abstractNumId w:val="2"/></w:num>
            </w:numbering>
        `;
        const documentXml = `
            <w:document><w:body>
                <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="10"/></w:numPr></w:pPr></w:p>
                <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="20"/></w:numPr></w:pPr></w:p>
                <w:p><w:r><w:t>Plain</w:t></w:r></w:p>
            </w:body></w:document>
        `;

        assert.deepEqual(extractParagraphListStylesFromDocxXml(documentXml, numberingXml), [
            { kind: 'orderedList', style: 'lower-alpha' },
            { kind: 'bulletList', style: 'square' },
            null,
        ]);
    });

    it('annotates imported HTML lists with recovered DOCX list styles', () => {
        const originalDomParser = globalThis.DOMParser;

        try {
            class FakeElement {
                tagName: string;
                attrs = new Map<string, string>();

                constructor(tagName: string) {
                    this.tagName = tagName;
                }

                setAttribute(name: string, value: string) {
                    this.attrs.set(name, value);
                }

                getAttribute(name: string) {
                    return this.attrs.get(name) ?? null;
                }
            }

            const paragraph = new FakeElement('P');
            const orderedList = new FakeElement('OL');
            const bulletList = new FakeElement('UL');

            // @ts-expect-error Minimal DOMParser implementation for this pure helper test.
            globalThis.DOMParser = class {
                parseFromString() {
                    return {
                        body: {
                            querySelectorAll: (selector: string) => {
                                if (selector === 'p, h1, h2, h3, h4, h5, h6') return [paragraph];
                                if (selector === 'ul, ol') return [orderedList, bulletList];
                                return [];
                            },
                            get innerHTML() {
                                return [
                                    orderedList.getAttribute('data-list-style-type'),
                                    bulletList.getAttribute('data-list-style-type'),
                                ].join('|');
                            },
                        },
                    };
                }
            };

            const html = annotateImportedDocxHtml(
                '<ol><li>A</li></ol><ul><li>B</li></ul>',
                [{ leftIndent: 0, firstLineIndent: 0, tabStops: [] }],
                [
                    { kind: 'orderedList', style: 'upper-roman' },
                    { kind: 'bulletList', style: 'circle' },
                ],
            );

            assert.equal(html, 'upper-roman|circle');
        } finally {
            globalThis.DOMParser = originalDomParser;
        }
    });

    it('extracts paragraph spacing, alignment, and border styles from DOCX XML', () => {
        const stylesXml = `
            <w:styles>
                <w:style w:type="paragraph" w:styleId="BodyText">
                    <w:pPr>
                        <w:spacing w:after="240"/>
                    </w:pPr>
                </w:style>
            </w:styles>
        `;
        const documentXml = `
            <w:document><w:body>
                <w:p>
                    <w:pPr>
                        <w:pStyle w:val="BodyText"/>
                        <w:spacing w:before="120" w:line="360"/>
                        <w:jc w:val="center"/>
                        <w:pBdr><w:bottom w:val="single" w:sz="8" w:color="5B23FF"/></w:pBdr>
                    </w:pPr>
                </w:p>
            </w:body></w:document>
        `;

        assert.deepEqual(extractParagraphStylesFromDocxXml(documentXml, stylesXml), [{
            style: 'margin-bottom: 16px; margin-top: 8px; line-height: 1.50; text-align: center; border-bottom: 1px solid #5B23FF',
        }]);
    });

    it('extracts table-cell borders, padding, and shading from DOCX XML', () => {
        const documentXml = `
            <w:document><w:body>
                <w:tbl>
                    <w:tr>
                        <w:tc>
                            <w:tcPr>
                                <w:tcBorders><w:top w:val="single" w:sz="8" w:color="111111"/></w:tcBorders>
                                <w:tcMar><w:left w:w="120"/><w:right w:w="120"/></w:tcMar>
                                <w:shd w:fill="EEEEEE"/>
                            </w:tcPr>
                        </w:tc>
                    </w:tr>
                </w:tbl>
            </w:body></w:document>
        `;

        assert.deepEqual(extractTableCellStylesFromDocxXml(documentXml), [{
            style: 'border-top: 1px solid #111111; background-color: #EEEEEE; padding-right: 8px; padding-left: 8px',
        }]);
    });
});
