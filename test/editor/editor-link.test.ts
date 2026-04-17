import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEditorLinkUrl } from '../../src/lib/editor-link.ts';

test('normalizeEditorLinkUrl keeps complete https links', () => {
    assert.deepEqual(normalizeEditorLinkUrl('https://gracon.rw/docs'), {
        ok: true,
        url: 'https://gracon.rw/docs',
    });
});

test('normalizeEditorLinkUrl upgrades domain input to https', () => {
    assert.deepEqual(normalizeEditorLinkUrl('gracon.rw/docs'), {
        ok: true,
        url: 'https://gracon.rw/docs',
    });
});

test('normalizeEditorLinkUrl converts plain email to mailto', () => {
    assert.deepEqual(normalizeEditorLinkUrl('legal@gracon.rw'), {
        ok: true,
        url: 'mailto:legal@gracon.rw',
    });
});

test('normalizeEditorLinkUrl rejects scriptable and protocol-relative links', () => {
    assert.equal(normalizeEditorLinkUrl('javascript:alert(1)').ok, false);
    assert.equal(normalizeEditorLinkUrl('data:text/html,<svg>').ok, false);
    assert.equal(normalizeEditorLinkUrl('//evil.example/path').ok, false);
});
