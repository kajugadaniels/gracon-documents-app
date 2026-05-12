import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SignatureBlockExtension } from '../../src/store/editor/signature-block-extension.ts';

test('SignatureBlockExtension renders an assigned pending signature block', () => {
    const html = SignatureBlockExtension.config.renderHTML?.({
        HTMLAttributes: {
            signerName: 'Jane Doe',
            signerRole: 'Required signer',
            signerEmail: 'jane@example.com',
        },
    });

    assert.equal(html?.[0], 'section');
    assert.equal((html?.[1] as Record<string, string>)['data-type'], 'signature-block');
    assert.equal((html?.[1] as Record<string, string>).class, 'document-signature-block');
    assert.deepEqual(html?.[3], [
        'div',
        { class: 'document-signature-block__meta' },
        ['strong', {}, 'Jane Doe'],
        ['span', {}, 'jane@example.com'],
        '',
    ]);
    assert.equal(html?.length, 4);
});

test('SignatureBlockExtension renders signed state when signature data exists', () => {
    const html = SignatureBlockExtension.config.renderHTML?.({
        HTMLAttributes: {
            signerName: 'Jane Doe',
            signatureId: 'sig_123',
            signatureImageUrl: 'https://example.com/signature.png',
        },
    });

    assert.equal(
        (html?.[1] as Record<string, string>).class,
        'document-signature-block document-signature-block--signed',
    );
    assert.equal(html?.length, 4);
});

test('SignatureBlockExtension renders digitally signed text when signed without an image', () => {
    const html = SignatureBlockExtension.config.renderHTML?.({
        HTMLAttributes: {
            signerName: 'Jane Doe',
            signatureId: 'sig_123',
            signedAt: '2026-05-08T00:00:00.000Z',
        },
    });

    assert.deepEqual((html?.[2] as unknown[])[2], [
        'span',
        { class: 'document-signature-block__signed-text' },
        'Digitally signed',
    ]);
});
