import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildSignatureBlockInserts,
    getSignatureBlockSigners,
} from '../../src/lib/editor-signature-blocks.ts';

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
        signerRole: 'Signer',
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

test('getSignatureBlockSigners uses finalised signature requests as the exact signer set', () => {
    const signers = getSignatureBlockSigners({
        access: { isOwner: true },
        collaborators: [{
            id: 'access-collaborator',
            userId: 'collaborator-user',
            permissions: ['SIGN'],
            invitationStatus: 'ACCEPTED',
            isActive: true,
            user: {
                email: 'collaborator@example.com',
                displayName: 'Collaborator User',
            },
        }],
        signatureRequests: [
            {
                id: 'request-owner',
                requestedUserId: 'owner-user',
                requestedUser: null,
            },
            {
                id: 'request-invited',
                requestedUserId: 'invited-user',
                requestedUser: {
                    email: 'invited@example.com',
                    displayName: 'Invited User',
                },
            },
        ],
    } as never, {
        userId: 'owner-user',
        email: 'owner@example.com',
        postNames: 'Owner',
        surName: 'Person',
    } as never);

    assert.deepEqual(signers, [
        {
            accessId: 'request-owner',
            userId: 'owner-user',
            displayName: 'Owner Person',
            email: 'owner@example.com',
        },
        {
            accessId: 'request-invited',
            userId: 'invited-user',
            displayName: 'Invited User',
            email: 'invited@example.com',
        },
    ]);
});
