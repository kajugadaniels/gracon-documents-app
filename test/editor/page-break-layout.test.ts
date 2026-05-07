import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    getManualPageBreakControlTop,
    getManualPageBreakPageIndex,
    getManualPageBreakSpacerHeight,
} from '../../src/lib/page-break-layout.ts';

test('getManualPageBreakPageIndex assigns page-gap breaks to the preceding page', () => {
    const pageIndex = getManualPageBreakPageIndex({
        breakTop: 1150,
        pageHeight: 1123,
        pageGap: 24,
        contentTopInset: 108,
    });

    assert.equal(pageIndex, 0);
});

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

test('getManualPageBreakControlTop places the label in the visual page gap', () => {
    const controlTop = getManualPageBreakControlTop({
        breakTop: 900,
        pageIndex: 0,
        pageHeight: 1123,
        pageGap: 24,
        spacerHeight: 337,
    });

    assert.equal(controlTop, 235);
});

test('getManualPageBreakControlTop clamps the label inside short spacers', () => {
    const controlTop = getManualPageBreakControlTop({
        breakTop: 1240,
        pageIndex: 0,
        pageHeight: 1123,
        pageGap: 24,
        spacerHeight: 34,
    });

    assert.equal(controlTop, 24);
});
