import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    BULLET_LIST_REFERENCE_BY_STYLE,
    ORDERED_LIST_REFERENCE_BY_STYLE,
    getBulletListReference,
    getListReferenceForElement,
    getOrderedListReference,
    readBulletListStyleFromElement,
    readOrderedListStyleFromElement,
} from '../../src/lib/editor-list-style.ts';

function createElement(
    tagName: 'UL' | 'OL',
    attrs: Record<string, string> = {},
    style: Record<string, string> = {},
) {
    return {
        tagName,
        style,
        getAttribute: (name: string) => attrs[name] ?? null,
    } as unknown as HTMLElement;
}

test('list style references map each supported style to a stable DOCX reference', () => {
    assert.deepEqual(BULLET_LIST_REFERENCE_BY_STYLE, {
        disc: 'bullet-list-disc',
        circle: 'bullet-list-circle',
        square: 'bullet-list-square',
    });
    assert.deepEqual(ORDERED_LIST_REFERENCE_BY_STYLE, {
        decimal: 'ordered-list-decimal',
        'lower-alpha': 'ordered-list-lower-alpha',
        'upper-alpha': 'ordered-list-upper-alpha',
        'lower-roman': 'ordered-list-lower-roman',
        'upper-roman': 'ordered-list-upper-roman',
    });
});

test('list style references normalize unknown values to editor defaults', () => {
    assert.equal(getBulletListReference('circle'), 'bullet-list-circle');
    assert.equal(getBulletListReference('decimal'), 'bullet-list-disc');

    assert.equal(getOrderedListReference('upper-roman'), 'ordered-list-upper-roman');
    assert.equal(getOrderedListReference('square'), 'ordered-list-decimal');
});

test('list style readers prefer schema data attributes over inline styles', () => {
    const bulletList = createElement('UL', {
        'data-list-style-type': 'square',
    }, {
        listStyleType: 'circle',
    });
    const orderedList = createElement('OL', {
        'data-list-style-type': 'lower-alpha',
    }, {
        listStyleType: 'upper-roman',
    });

    assert.equal(readBulletListStyleFromElement(bulletList), 'square');
    assert.equal(readOrderedListStyleFromElement(orderedList), 'lower-alpha');
    assert.equal(getListReferenceForElement(bulletList), 'bullet-list-square');
    assert.equal(getListReferenceForElement(orderedList), 'ordered-list-lower-alpha');
});
