import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createTableCellStyle,
    normalizeTableCellBorderWidth,
    normalizeTableCellColor,
} from '../../src/store/editor/table-cell-style-extension.ts';

test('table cell styles default to white cells with black borders', () => {
    assert.equal(
        createTableCellStyle({}),
        [
            'background-color: #ffffff',
            'border-top: 1px solid #111827',
            'border-right: 1px solid #111827',
            'border-bottom: 1px solid #111827',
            'border-left: 1px solid #111827',
        ].join('; '),
    );
});

test('table cell style normalizers clamp invalid border values', () => {
    assert.equal(normalizeTableCellColor(' #FFAA00 '), '#ffaa00');
    assert.equal(normalizeTableCellColor('bad-value'), '#111827');
    assert.equal(normalizeTableCellBorderWidth(-10), 0);
    assert.equal(normalizeTableCellBorderWidth(30), 12);
});
