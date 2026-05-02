import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    A4_PAPER_HEIGHT_PX,
    A4_PAPER_WIDTH_PX,
} from '../../src/constants/document-paper.ts';
import { buildPagedDocumentModel } from '../../src/lib/paged-document-model.ts';

test('buildPagedDocumentModel creates measured A4 page containers', () => {
    const model = buildPagedDocumentModel({
        pageCount: 3,
        pageHeight: A4_PAPER_HEIGHT_PX,
        contentHeight: A4_PAPER_HEIGHT_PX * 3,
    });

    assert.equal(model.pageWidth, A4_PAPER_WIDTH_PX);
    assert.equal(model.pageHeight, A4_PAPER_HEIGHT_PX);
    assert.equal(model.visualHeight, A4_PAPER_HEIGHT_PX * 3);
    assert.equal(model.pages.length, 3);
    assert.deepEqual(model.pages.map((page) => page.top), [
        0,
        A4_PAPER_HEIGHT_PX,
        A4_PAPER_HEIGHT_PX * 2,
    ]);
});

test('buildPagedDocumentModel keeps at least one valid page', () => {
    const model = buildPagedDocumentModel({
        pageCount: 0,
        pageHeight: 0,
        contentHeight: 0,
    });

    assert.equal(model.pages.length, 1);
    assert.equal(model.totalHeight, A4_PAPER_HEIGHT_PX);
});
