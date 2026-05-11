import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    buildSignatureBlockInserts,
    getSignatureBlockSignerOrder,
    getSignatureBlockSigners,
    hasSignatureBlockForUser,
} from '../../src/lib/editor-signature-blocks.ts';

test('buildSignatureBlockInserts maps signers and completed signature evidence', () => {
    const blocks = buildSignatureBlockInserts([
        {
            accessId: 'access-1',
            userId: 'user-1',
            displayName: 'Jane Doe',
            email: 'jane@example.com',
            signatureId: null,
            signedAt: null,
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
        blockId: 'signature-user-1',
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

test('getSignatureBlockSignerOrder reads prepared signer order from editor content', () => {
    const content = {
        type: 'doc',
        content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Intro' }] },
            { type: 'signatureBlock', attrs: { signerUserId: 'owner-user' } },
            { type: 'signatureBlock', attrs: { signerUserId: 'invited-user' } },
        ],
    };

    assert.deepEqual(getSignatureBlockSignerOrder(content), ['owner-user', 'invited-user']);
    assert.equal(hasSignatureBlockForUser(content, 'owner-user'), true);
    assert.equal(hasSignatureBlockForUser(content, 'missing-user'), false);
});

test('getSignatureBlockSigners includes owner and invited draft signers for block preparation', () => {
    const signers = getSignatureBlockSigners({
        access: { isOwner: true },
        collaborators: [{
            id: 'access-collaborator',
            userId: 'collaborator-user',
            permissions: ['READ', 'SIGN'],
            invitationStatus: 'ACCEPTED',
            isActive: true,
            user: {
                email: 'collaborator@example.com',
                displayName: 'Collaborator User',
            },
        }],
        signatureRequests: [],
    } as never, {
        userId: 'owner-user',
        email: 'owner@example.com',
        postNames: 'Owner',
        surName: 'Person',
    } as never);

    assert.deepEqual(signers, [
        {
            accessId: 'owner',
            userId: 'owner-user',
            displayName: 'Owner Person',
            email: 'owner@example.com',
            isOwner: true,
        },
        {
            accessId: 'access-collaborator',
            userId: 'collaborator-user',
            displayName: 'Collaborator User',
            email: 'collaborator@example.com',
            isOwner: false,
        },
    ]);
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
                personalSignedDocumentId: 'signed-owner',
                signedAt: '2026-05-11T00:00:00.000Z',
                requestedUser: null,
            },
            {
                id: 'request-invited',
                requestedUserId: 'invited-user',
                personalSignedDocumentId: null,
                signedAt: null,
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
            isOwner: true,
            signatureId: 'signed-owner',
            signedAt: '2026-05-11T00:00:00.000Z',
        },
        {
            accessId: 'request-invited',
            userId: 'invited-user',
            displayName: 'Invited User',
            email: 'invited@example.com',
            isOwner: false,
            signatureId: null,
            signedAt: null,
        },
    ]);
});

test('buildSignatureBlockInserts falls back to signed request evidence', () => {
    const blocks = buildSignatureBlockInserts([
        {
            accessId: 'request-owner',
            userId: 'owner-user',
            displayName: 'Owner Person',
            email: 'owner@example.com',
            signatureId: 'signed-owner',
            signedAt: '2026-05-11T00:00:00.000Z',
        },
    ], []);

    assert.equal(blocks[0].signatureId, 'signed-owner');
    assert.equal(blocks[0].signedAt, '2026-05-11T00:00:00.000Z');
    assert.equal(blocks[0].signatureImageUrl, null);
});

test('buildSignatureBlockInserts uses locked snapshot image for a single signer block', () => {
    const blocks = buildSignatureBlockInserts([
        {
            accessId: 'owner',
            userId: 'owner-user',
            displayName: 'Owner Person',
            email: 'owner@example.com',
        },
    ], [], {
        signatureId: 'snapshot-signature',
        certificateId: 'cert-1',
        signerName: 'Owner Person',
        imageUrl: 'https://example.com/snapshot-signature.png',
        mimeType: 'image/png',
        sizeBytes: 1234,
        x: null,
        y: null,
        signedAt: '2026-05-11T01:00:00.000Z',
        lockedAt: '2026-05-11T01:05:00.000Z',
    });

    assert.equal(blocks[0].signatureId, 'snapshot-signature');
    assert.equal(blocks[0].signedAt, '2026-05-11T01:00:00.000Z');
    assert.equal(blocks[0].signatureImageUrl, 'https://example.com/snapshot-signature.png');
});
