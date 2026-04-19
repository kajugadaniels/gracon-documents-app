import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEditorImageUrl } from '../../src/lib/editor-image.ts';

test('normalizeEditorImageUrl accepts secure image URLs', () => {
    assert.deepEqual(normalizeEditorImageUrl('https://cdn.example.com/documents/sample.jpg'), {
        ok: true,
        url: 'https://cdn.example.com/documents/sample.jpg',
        host: 'cdn.example.com',
        likelyImage: true,
    });
});

test('normalizeEditorImageUrl adds https for complete host input', () => {
    assert.deepEqual(normalizeEditorImageUrl('cdn.example.com/file.png'), {
        ok: true,
        url: 'https://cdn.example.com/file.png',
        host: 'cdn.example.com',
        likelyImage: true,
    });
});

test('normalizeEditorImageUrl rejects unsafe protocols', () => {
    assert.equal(normalizeEditorImageUrl('data:image/png;base64,abc').ok, false);
    assert.equal(normalizeEditorImageUrl('javascript:alert(1)').ok, false);
    assert.equal(normalizeEditorImageUrl('blob:https://example.com/id').ok, false);
});

test('normalizeEditorImageUrl rejects insecure remote http URLs', () => {
    assert.equal(normalizeEditorImageUrl('http://cdn.example.com/file.png').ok, false);
});

test('normalizeEditorImageUrl rejects SVG image URLs', () => {
    assert.equal(normalizeEditorImageUrl('https://cdn.example.com/file.svg').ok, false);
});
