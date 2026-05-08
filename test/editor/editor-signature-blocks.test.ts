import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSignatureBlockInserts } from '../../src/lib/editor-signature-blocks.ts';

test('buildSignatureBlockInserts maps signers and completed signature evidence', () => {
    const blocks = buildSignatureBlockInserts([
        {
            accessId: 'access-1',
            userId: 'user-1',
            displayName: 'Jane Doe',
            email: 'jane@example.com',
        },
    ], [
        {
            signatureId: 'sig-1',
            certificateId: 'cert-1',
            signerId: 'user-1',
            signerName: 'Jane Doe',
            signerEmail: 'jane@example.com',
            imageUrl: 'https://example.com/signature.png',
            mimeType: 'image/png',
            sizeBytes: 1234,
            signedAt: '2026-05-08T00:00:00.000Z',
            isOwner: false,
        },
    ]);

    assert.deepEqual(blocks, [{
        blockId: 'signature-user-1-1',
        label: 'Jane Doe',
        signerRole: 'Required signer',
        required: true,
        signerUserId: 'user-1',
        signerAccessId: 'access-1',
        signerName: 'Jane Doe',
        signerEmail: 'jane@example.com',
        signatureId: 'sig-1',
        signedAt: '2026-05-08T00:00:00.000Z',
        signatureImageUrl: 'https://example.com/signature.png',
    }]);
});
