import type {
    CollaboratorPermission,
    DocumentAccessSummary,
    DocumentDetail,
    DocumentStatus,
} from '@/api/documents.api';

type DocumentPermissionInput = Pick<DocumentDetail, 'access'> | null;

export type DocumentEditorViewMode = 'editing' | 'viewing';

export interface DocumentEditorReadOnlyInput {
    status?: DocumentStatus | null;
    access?: DocumentAccessSummary;
    viewMode?: DocumentEditorViewMode;
}

export function hasDocumentPermission(
    doc: DocumentPermissionInput,
    permission: CollaboratorPermission,
) {
    if (!doc) return false;
    if (!doc.access) return true;
    if (doc.access.isOwner) return true;
    return doc.access.permissions.includes(permission);
}

export function isDocumentBaseReadOnly({
    status,
    access,
}: DocumentEditorReadOnlyInput) {
    return status !== 'DRAFT' || !hasDocumentPermission({ access }, 'EDIT');
}

export function isDocumentEditorReadOnly(input: DocumentEditorReadOnlyInput) {
    const baseReadOnly = isDocumentBaseReadOnly(input);
    return baseReadOnly || input.viewMode === 'viewing';
}
