import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SectionBreakExtension } from '../../src/components/editor/section-break-extension.ts';

test('SectionBreakExtension renders a stable section break marker', () => {
    const html = SectionBreakExtension.config.renderHTML?.({
        HTMLAttributes: {},
    });

    assert.deepEqual(html, [
        'div',
        {
            'data-type': 'section-break',
            'data-section-break': 'true',
            class: 'document-section-break',
        },
        ['span', { class: 'document-section-break__label' }, 'Section break'],
    ]);
});
