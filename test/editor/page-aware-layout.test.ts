import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPageAwareBlockDecision } from '../../src/lib/page-aware-layout.ts';

test('getPageAwareBlockDecision leaves blocks that fit on the current page', () => {
    const decision = getPageAwareBlockDecision({
        offsetTop: 120,
        blockHeight: 240,
        pageHeight: 1000,
    });

    assert.deepEqual(decision, {
        offset: 0,
        oversized: false,
        crossesPage: false,
    });
});

test('getPageAwareBlockDecision pushes normal blocks to the next page', () => {
    const decision = getPageAwareBlockDecision({
        offsetTop: 900,
        blockHeight: 240,
        pageHeight: 1000,
    });

    assert.deepEqual(decision, {
        offset: 100,
        oversized: false,
        crossesPage: true,
    });
});

test('getPageAwareBlockDecision warns without pushing oversized blocks', () => {
    const decision = getPageAwareBlockDecision({
        offsetTop: 900,
        blockHeight: 860,
        pageHeight: 1000,
        oversizedThreshold: 800,
    });

    assert.deepEqual(decision, {
        offset: 0,
        oversized: true,
        crossesPage: true,
    });
});

test('getPageAwareBlockDecision does not push content already at page top', () => {
    const decision = getPageAwareBlockDecision({
        offsetTop: 1000,
        blockHeight: 500,
        pageHeight: 1000,
    });

    assert.deepEqual(decision, {
        offset: 0,
        oversized: false,
        crossesPage: false,
    });
});
