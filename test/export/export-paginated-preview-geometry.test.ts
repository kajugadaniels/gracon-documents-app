import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    createPaginatedPageStartOffsets,
    getPaginatedSnapshotPageHeightPixels,
} from '../../src/lib/export-paginated-preview-geometry.ts';

test('createPaginatedPageStartOffsets starts at page one and clamps invalid offsets', () => {
    const offsets = createPaginatedPageStartOffsets({
        scrollHeight: 2600,
        pageHeight: 1000,
        gapEndOffsets: [-40, 1000, 1000, 2050, Number.NaN, 2800],
    });

    assert.deepEqual(offsets, [0, 1000, 1600]);
});

test('createPaginatedPageStartOffsets keeps at least one page for short documents', () => {
    const offsets = createPaginatedPageStartOffsets({
        scrollHeight: 420,
        pageHeight: 1000,
        gapEndOffsets: [1000],
    });

    assert.deepEqual(offsets, [0]);
});

test('getPaginatedSnapshotPageHeightPixels maps CSS page height to canvas pixels', () => {
    const pageHeightPixels = getPaginatedSnapshotPageHeightPixels({
        snapshotHeight: 4000,
        cssSnapshotHeight: 2000,
        pageHeight: 1000,
    });

    assert.equal(pageHeightPixels, 2000);
});
