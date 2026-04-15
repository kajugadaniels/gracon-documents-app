import test from 'node:test';
import assert from 'node:assert/strict';
import {
    resolveDocumentsVerificationRedirect,
    shouldAutoReturnInvitationVerification,
} from '../../src/components/pages/verification/verification-routing.ts';

test('falls back to the documents index when next is missing', () => {
    assert.deepEqual(
        resolveDocumentsVerificationRedirect(null, 'http://localhost:4002'),
        { kind: 'internal', destination: '/documents' },
    );
});

test('allows same-origin invitation return redirects', () => {
    assert.deepEqual(
        resolveDocumentsVerificationRedirect(
            'http://localhost:4002/invitations/token-123',
            'http://localhost:4002',
        ),
        {
            kind: 'external',
            destination: 'http://localhost:4002/invitations/token-123',
        },
    );
});

test('rejects foreign or invalid redirect targets', () => {
    assert.deepEqual(
        resolveDocumentsVerificationRedirect(
            'https://example.com/bad',
            'http://localhost:4002',
        ),
        { kind: 'internal', destination: '/documents' },
    );
    assert.deepEqual(
        resolveDocumentsVerificationRedirect('broken-url', 'http://localhost:4002'),
        { kind: 'internal', destination: '/documents' },
    );
});

test('auto-return only happens for passed invitation verifications', () => {
    assert.equal(
        shouldAutoReturnInvitationVerification('INVITATION', true),
        true,
    );
    assert.equal(
        shouldAutoReturnInvitationVerification('INVITATION', false),
        false,
    );
    assert.equal(
        shouldAutoReturnInvitationVerification('STANDARD', true),
        false,
    );
});
