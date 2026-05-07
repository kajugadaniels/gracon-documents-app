import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PageBreakExtension } from '../../src/components/editor/page-break-extension.ts';

test('PageBreakExtension renders a stable page break marker', () => {
    const html = PageBreakExtension.config.renderHTML?.({
        HTMLAttributes: {},
    });

    assert.deepEqual(html, [
        'div',
        {
            'data-type': 'page-break',
            'data-page-break': 'true',
            class: 'document-page-break',
        },
        ['span', { class: 'document-page-break__label' }, 'Page break'],
    ]);
});
