import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createDocxPageProperties,
    createPaperExportGeometry,
    createParagraphExportGeometry,
    pxToTwip,
} from '../../src/lib/document-layout-export-parity.ts';

test('creates matching PDF CSS and DOCX margin geometry', () => {
    const geometry = createPaperExportGeometry({
        paperSize: 'A4',
        margins: {
            top: 72,
            right: 84,
            bottom: 96,
            left: 108,
        },
    });

    assert.equal(geometry.printableWidth, 602);
    assert.equal(geometry.cssVars['--editor-page-padding-left'], '108px');
    assert.equal(geometry.cssVars['--paper-printable-width'], '602px');
    assert.deepEqual(geometry.docxTwipMargins, {
        top: 1080,
        right: 1260,
        bottom: 1440,
        left: 1620,
    });
});

test('creates DOCX page properties from the same paper geometry', () => {
    const pageProperties = createDocxPageProperties({
        paperSize: 'A4',
        margins: {
            top: 72,
            right: 84,
            bottom: 96,
            left: 108,
        },
    });

    assert.equal(pageProperties.page.margin.left, 1620);
    assert.equal(pageProperties.page.margin.header, 0);
    assert.equal(pageProperties.page.size.width, 11906);
});

test('converts paragraph indents and tab stops to shared export geometry', () => {
    const paragraph = createParagraphExportGeometry({
        leftIndent: 48,
        firstLineIndent: 24,
        tabStops: [47, 96, 97, 4000],
    });

    assert.equal(paragraph.cssStyle, 'margin-left: 48px; text-indent: 24px');
    assert.deepEqual(paragraph.dataAttributes, {
        leftIndent: '48',
        firstLineIndent: '24',
        tabStops: '[48,96,602]',
    });
    assert.deepEqual(paragraph.docxIndentTwips, {
        left: 720,
        firstLine: 360,
    });
    assert.deepEqual(paragraph.docxTabStopTwips, [720, 1440, 9030]);
});

test('exports hanging first-line indents as DOCX hanging indents', () => {
    const paragraph = createParagraphExportGeometry({
        leftIndent: 72,
        firstLineIndent: -24,
        tabStops: [],
    });

    assert.deepEqual(paragraph.docxIndentTwips, {
        left: 1080,
        hanging: 360,
    });
});

test('converts pixels to twips without negative values', () => {
    assert.equal(pxToTwip(96), 1440);
    assert.equal(pxToTwip(-10), 0);
});
