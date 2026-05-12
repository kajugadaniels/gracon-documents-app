import test from 'node:test';
import assert from 'node:assert/strict';
import { convertPdfPagesToTiptapContent } from '../../src/lib/import-pdf-layout.ts';

test('converts positioned PDF text into editable TipTap paragraphs', () => {
    const content = convertPdfPagesToTiptapContent([
        {
            width: 612,
            height: 792,
            styles: {
                body: { fontFamily: 'Arial' },
            },
            items: [
                {
                    str: 'Service',
                    transform: [12, 0, 0, 12, 72, 720],
                    width: 42,
                    height: 12,
                    fontName: 'body',
                },
                {
                    str: 'agreement',
                    transform: [12, 0, 0, 12, 120, 720],
                    width: 58,
                    height: 12,
                    fontName: 'body',
                },
                {
                    str: 'First line',
                    transform: [11, 0, 0, 11, 72, 690],
                    width: 48,
                    height: 11,
                    fontName: 'body',
                },
                {
                    str: 'Second line',
                    transform: [11, 0, 0, 11, 72, 674],
                    width: 62,
                    height: 11,
                    fontName: 'body',
                },
            ],
        },
    ]);

    const nodes = content.content as Array<Record<string, unknown>>;
    assert.equal(content.type, 'doc');
    assert.equal(nodes.length, 2);
    assert.equal(nodes[0].type, 'paragraph');
    assert.deepEqual(nodes[0].attrs, {
        leftIndent: 71,
        firstLineIndent: 0,
        tabStops: [],
    });
    assert.deepEqual(nodes[0].content, [
        {
            type: 'text',
            text: 'Service',
            marks: [{ type: 'textStyle', attrs: { fontSize: '8.9pt', fontFamily: 'Arial' } }],
        },
        { type: 'text', text: ' ' },
        {
            type: 'text',
            text: 'agreement',
            marks: [{ type: 'textStyle', attrs: { fontSize: '8.9pt', fontFamily: 'Arial' } }],
        },
    ]);
    assert.equal(nodes[1].type, 'paragraph');
    assert.deepEqual((nodes[1].content as unknown[])[1], { type: 'hardBreak' });
});

test('detects PDF heading text and font traits', () => {
    const content = convertPdfPagesToTiptapContent([
        {
            width: 612,
            height: 792,
            styles: {
                title: { fontFamily: 'Helvetica-Bold' },
                body: { fontFamily: 'Helvetica' },
            },
            items: [
                {
                    str: 'Purpose',
                    transform: [22, 0, 0, 22, 72, 720],
                    width: 82,
                    height: 22,
                    fontName: 'title',
                },
                {
                    str: 'Normal paragraph text',
                    transform: [11, 0, 0, 11, 72, 680],
                    width: 118,
                    height: 11,
                    fontName: 'body',
                },
            ],
        },
    ]);

    const nodes = content.content as Array<Record<string, unknown>>;
    assert.equal(nodes[0].type, 'heading');
    assert.deepEqual(nodes[0].attrs, {
        level: 1,
        leftIndent: 71,
        firstLineIndent: 0,
        tabStops: [],
    });
    assert.deepEqual(nodes[0].content, [
        {
            type: 'text',
            text: 'Purpose',
            marks: [
                { type: 'bold' },
                { type: 'textStyle', attrs: { fontSize: '16.2pt', fontFamily: 'Helvetica-Bold' } },
            ],
        },
    ]);
});
