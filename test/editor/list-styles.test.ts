import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    BULLET_LIST_STYLE_OPTIONS,
    BULLET_LIST_STYLE_VALUES,
    DEFAULT_BULLET_LIST_STYLE,
    DEFAULT_ORDERED_LIST_STYLE,
    LIST_STYLE_OPTIONS_BY_KIND,
    ORDERED_LIST_STYLE_OPTIONS,
    ORDERED_LIST_STYLE_VALUES,
    isBulletListStyle,
    isOrderedListStyle,
    normalizeBulletListStyle,
    normalizeOrderedListStyle,
} from '../../src/constants/list-styles.ts';

test('list style options expose controlled bullet and ordered styles', () => {
    assert.deepEqual([...BULLET_LIST_STYLE_VALUES], ['disc', 'circle', 'square']);
    assert.deepEqual([...ORDERED_LIST_STYLE_VALUES], [
        'decimal',
        'lower-alpha',
        'upper-alpha',
        'lower-roman',
        'upper-roman',
    ]);
    assert.equal(BULLET_LIST_STYLE_OPTIONS.length, BULLET_LIST_STYLE_VALUES.length);
    assert.equal(ORDERED_LIST_STYLE_OPTIONS.length, ORDERED_LIST_STYLE_VALUES.length);
});

test('list style options are grouped by editor list kind', () => {
    assert.equal(LIST_STYLE_OPTIONS_BY_KIND.bulletList, BULLET_LIST_STYLE_OPTIONS);
    assert.equal(LIST_STYLE_OPTIONS_BY_KIND.orderedList, ORDERED_LIST_STYLE_OPTIONS);
});

test('list style guards reject cross-kind and unknown values', () => {
    assert.equal(isBulletListStyle('disc'), true);
    assert.equal(isBulletListStyle('decimal'), false);
    assert.equal(isBulletListStyle('unknown'), false);

    assert.equal(isOrderedListStyle('upper-roman'), true);
    assert.equal(isOrderedListStyle('square'), false);
    assert.equal(isOrderedListStyle(null), false);
});

test('list style normalization falls back to editor defaults', () => {
    assert.equal(normalizeBulletListStyle('circle'), 'circle');
    assert.equal(normalizeBulletListStyle('decimal'), DEFAULT_BULLET_LIST_STYLE);

    assert.equal(normalizeOrderedListStyle('lower-alpha'), 'lower-alpha');
    assert.equal(normalizeOrderedListStyle('disc'), DEFAULT_ORDERED_LIST_STYLE);
});
