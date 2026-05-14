import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    hasDocumentPermission,
    isDocumentBaseReadOnly,
    isDocumentEditorReadOnly,
} from '../../src/lib/document-readonly.ts';
import type { DocumentAccessSummary, DocumentStatus } from '../../src/api/documents.api.ts';

const ownerEditAccess: DocumentAccessSummary = {
    isOwner: true,
    role: 'OWNER',
    collaboratorId: null,
    permissions: ['READ', 'EDIT', 'SIGN', 'MANAGE_ACCESS'],
    acceptedAt: null,
    sharedBy: null,
};

function accessWithEditPermission(): DocumentAccessSummary {
    return {
        isOwner: false,
        role: 'EDITOR',
        collaboratorId: 'collab-1',
        permissions: ['READ', 'EDIT'],
        acceptedAt: '2026-05-14T00:00:00.000Z',
        sharedBy: null,
    };
}

test('signed and locked documents are read-only even for owners with edit permission', () => {
    const immutableStatuses: DocumentStatus[] = ['SIGNED', 'LOCKED'];

    immutableStatuses.forEach((status) => {
        assert.equal(
            isDocumentBaseReadOnly({ status, access: ownerEditAccess }),
            true,
            `${status} should be base read-only for owners`,
        );
        assert.equal(
            isDocumentEditorReadOnly({ status, access: ownerEditAccess, viewMode: 'editing' }),
            true,
            `${status} should block live editor edits`,
        );
    });
});

test('finalised documents are read-only while draft documents with edit access remain editable', () => {
    const collaboratorAccess = accessWithEditPermission();

    assert.equal(
        isDocumentEditorReadOnly({
            status: 'FINALISED',
            access: collaboratorAccess,
            viewMode: 'editing',
        }),
        true,
    );
    assert.equal(
        isDocumentEditorReadOnly({
            status: 'DRAFT',
            access: collaboratorAccess,
            viewMode: 'editing',
        }),
        false,
    );
});

test('viewing mode and missing edit permission keep a draft document read-only', () => {
    const viewerAccess: DocumentAccessSummary = {
        ...accessWithEditPermission(),
        role: 'VIEWER',
        permissions: ['READ'],
    };

    assert.equal(hasDocumentPermission({ access: viewerAccess }, 'EDIT'), false);
    assert.equal(
        isDocumentEditorReadOnly({ status: 'DRAFT', access: viewerAccess, viewMode: 'editing' }),
        true,
    );
    assert.equal(
        isDocumentEditorReadOnly({
            status: 'DRAFT',
            access: accessWithEditPermission(),
            viewMode: 'viewing',
        }),
        true,
    );
});
