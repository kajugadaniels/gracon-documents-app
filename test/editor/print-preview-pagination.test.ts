import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPrintPreviewPaginationConfig } from '../../src/lib/print-preview-pagination.ts';

test('buildPrintPreviewPaginationConfig maps A4 geometry and layout margins', () => {
    const config = buildPrintPreviewPaginationConfig({
        title: 'Invoice',
        status: 'DRAFT',
        layout: {
            paperSize: 'A4',
            margins: { top: 96, right: 76, bottom: 96, left: 76 },
            headerFooter: {
                headerEnabled: true,
                footerEnabled: true,
                pageNumbersEnabled: true,
                headerText: '',
                footerText: '',
            },
        },
    });

    assert.equal(config.enabled, true);
    assert.equal(config.pageWidth, 794);
    assert.equal(config.pageHeight, 1123);
    assert.equal(config.marginTop, 96);
    assert.equal(config.marginRight, 76);
    assert.equal(config.marginBottom, 96);
    assert.equal(config.marginLeft, 76);
    assert.equal(config.headerLeft, 'Invoice');
    assert.equal(config.headerRight, 'Page {page}');
    assert.equal(config.footerLeft, 'draft document');
    assert.equal(config.footerRight, 'Page {page}');
});

test('buildPrintPreviewPaginationConfig escapes header and footer html', () => {
    const config = buildPrintPreviewPaginationConfig({
        title: '<script>alert(1)</script>',
        status: 'DRAFT',
        layout: {
            paperSize: 'A4',
            margins: { top: 96, right: 76, bottom: 96, left: 76 },
            headerFooter: {
                headerEnabled: true,
                footerEnabled: true,
                pageNumbersEnabled: false,
                headerText: '',
                footerText: '<b>unsafe</b>',
            },
        },
    });

    assert.equal(config.headerLeft, '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.equal(config.footerLeft, '&lt;b&gt;unsafe&lt;/b&gt;');
    assert.equal(config.headerRight, '');
    assert.equal(config.footerRight, '');
});
