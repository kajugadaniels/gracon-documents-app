import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAutomaticPageFlowBlockOffset } from '../../src/lib/page-flow-layout.ts';

test('getAutomaticPageFlowBlockOffset pushes blocks out of the next page top chrome', () => {
    const offset = getAutomaticPageFlowBlockOffset({
        offsetTop: 1132,
        blockHeight: 80,
        pageHeight: 1123,
        pageGap: 24,
        contentTopInset: 108,
        contentBottomInset: 112,
    });

    assert.equal(offset, 123);
});

test('getAutomaticPageFlowBlockOffset pushes blocks that start in the page gap', () => {
    const offset = getAutomaticPageFlowBlockOffset({
        offsetTop: 1130,
        blockHeight: 80,
        pageHeight: 1123,
        pageGap: 24,
        contentTopInset: 108,
        contentBottomInset: 112,
    });

    assert.equal(offset, 125);
});

test('getAutomaticPageFlowBlockOffset moves fitting blocks away from bottom chrome', () => {
    const offset = getAutomaticPageFlowBlockOffset({
        offsetTop: 980,
        blockHeight: 80,
        pageHeight: 1123,
        pageGap: 24,
        contentTopInset: 108,
        contentBottomInset: 112,
    });

    assert.equal(offset, 275);
});

test('getAutomaticPageFlowBlockOffset does not move oversized crossing blocks', () => {
    const offset = getAutomaticPageFlowBlockOffset({
        offsetTop: 980,
        blockHeight: 960,
        pageHeight: 1123,
        pageGap: 24,
        contentTopInset: 108,
        contentBottomInset: 112,
    });

    assert.equal(offset, 0);
});
