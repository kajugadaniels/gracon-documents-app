import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getManualPageBreakSpacerHeight } from '../../src/lib/page-break-layout.ts';

test('getManualPageBreakSpacerHeight moves following content to next page content start', () => {
    const spacer = getManualPageBreakSpacerHeight({
        breakTop: 900,
        pageHeight: 1123,
        pageGap: 24,
        contentTopInset: 108,
        breakMinHeight: 34,
        breakMarginBottom: 18,
    });

    assert.equal(spacer, 337);
});

test('getManualPageBreakSpacerHeight treats breaks in the page gap as belonging to the previous page', () => {
    const spacer = getManualPageBreakSpacerHeight({
        breakTop: 1150,
        pageHeight: 1123,
        pageGap: 24,
        contentTopInset: 108,
        breakMinHeight: 34,
        breakMarginBottom: 18,
    });

    assert.equal(spacer, 87);
});

test('getManualPageBreakSpacerHeight preserves visible marker height near a target page start', () => {
    const spacer = getManualPageBreakSpacerHeight({
        breakTop: 1240,
        pageHeight: 1123,
        pageGap: 24,
        contentTopInset: 108,
        breakMinHeight: 34,
        breakMarginBottom: 18,
    });

    assert.equal(spacer, 34);
});
