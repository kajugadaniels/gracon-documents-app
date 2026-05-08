import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SignatureBlockExtension } from '../../src/components/editor/signature-block-extension.ts';

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
        ['span', {}, 'Required signer - jane@example.com'],
    ]);
    assert.deepEqual(html?.[4], ['em', {}, 'Required']);
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
    assert.deepEqual(html?.[4], ['em', {}, 'Signed']);
});
