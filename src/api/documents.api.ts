import { apiClient } from './client';

export type DocumentType = 'RICH_TEXT' | 'SPREADSHEET';
export type DocumentStatus = 'DRAFT' | 'FINALISED' | 'SIGNED' | 'LOCKED';
export type DocumentListScope = 'ALL_ACCESSIBLE' | 'OWNED' | 'SHARED_WITH_ME';
export type CollaboratorPermission =
    | 'READ'
    | 'COMMENT'
    | 'SIGN'
    | 'EDIT'
    | 'MANAGE_ACCESS';

export interface DocumentAccessSummary {
    isOwner: boolean;
    role: 'OWNER' | 'VIEWER' | 'EDITOR' | 'SIGNER' | null;
    collaboratorId: string | null;
    permissions: CollaboratorPermission[];
    acceptedAt: string | null;
    sharedBy: {
        id: string;
        email: string;
        displayName: string;
    } | null;
}

export interface DocumentSummary {
    id: string;
    title: string;
    type: DocumentType;
    status: DocumentStatus;
    tags: string[];
    wordCount: number;
    folderId: string | null;
    createdAt: string;
    updatedAt: string;
    signedAt: string | null;
    lockedAt: string | null;
    access?: DocumentAccessSummary;
}

export interface DocumentSignatureSnapshot {
    signatureId: string | null;
    certificateId: string | null;
    signerName: string | null;
    imageUrl: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    /** Normalized horizontal position of the strip (0.0 = left edge, 1.0 = right edge). */
    x: number | null;
    /** Normalized vertical position of the strip (0.0 = top, 1.0 = bottom). */
    y: number | null;
    signedAt: string | null;
    lockedAt: string | null;
}

export interface DocumentDetail extends DocumentSummary {
    content: Record<string, unknown> | null;
    contentHash: string | null;
    collaborators: { userId: string; role: string; acceptedAt: string | null }[];
    signatureSnapshot: DocumentSignatureSnapshot | null;
}

export interface DocumentVersion {
    id: string;
    versionNumber: number;
    wordCount: number;
    createdAt: string;
}

export interface Template {
    id: string;
    name: string;
    description: string;
    category: string;
    type: DocumentType;
    usageCount: number;
    contentJson?: Record<string, unknown>;
    previewUrl?: string;
}

export interface Folder {
    id: string;
    name: string;
    parentFolderId: string | null;
    subFolders: Folder[];
}

const pendingGetRequests = new Map<string, Promise<unknown>>();

function buildGetRequestKey(path: string, params?: unknown) {
    return `${path}::${JSON.stringify(params ?? null)}`;
}

async function getDeduped<T>(path: string, params?: unknown): Promise<T> {
    const key = buildGetRequestKey(path, params);
    const pending = pendingGetRequests.get(key);

    if (pending) {
        return pending as Promise<T>;
    }

    const request = apiClient
        .get<T>(path, { params })
        .then((res) => res.data)
        .finally(() => {
            pendingGetRequests.delete(key);
        });

    pendingGetRequests.set(key, request as Promise<unknown>);
    return request;
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function createDocument(data: {
    title?: string;
    type: DocumentType;
    folderId?: string;
    templateId?: string;
    tags?: string[];
}): Promise<DocumentSummary> {
    const res = await apiClient.post('/documents', data);
    return res.data;
}

export async function listDocuments(params: {
    scope?: DocumentListScope;
    status?: DocumentStatus;
    type?: DocumentType;
    folderId?: string;
    search?: string;
    page?: number;
    limit?: number;
}): Promise<{ total: number; page: number; limit: number; items: DocumentSummary[] }> {
    return getDeduped('/documents', params);
}

export async function getDocument(
    id: string,
    includeContent = true,
): Promise<DocumentDetail> {
    return getDeduped(`/documents/${id}`, { includeContent });
}

export async function autosaveDocument(
    id: string,
    content: Record<string, unknown>,
    wordCount?: number,
): Promise<{ saved: boolean; versionNumber: number; savedAt: string }> {
    const res = await apiClient.patch(`/documents/${id}/autosave`, { content, wordCount });
    return res.data;
}

export async function updateDocumentMeta(
    id: string,
    data: { title?: string; tags?: string[] },
): Promise<DocumentSummary> {
    const res = await apiClient.patch(`/documents/${id}`, data);
    return res.data;
}

export async function copyDocument(id: string): Promise<DocumentSummary> {
    const res = await apiClient.post(`/documents/${id}/copy`);
    return res.data;
}

export async function finaliseDocument(
    id: string,
    note?: string,
): Promise<DocumentSummary & { contentHash: string; message: string }> {
    const res = await apiClient.post(`/documents/${id}/finalise`, { note });
    return res.data;
}

export async function lockDocument(
    id: string,
    signatureId: string,
    documentHash: string,
): Promise<DocumentSummary & {
    signatureId: string;
    message: string;
    signatureSnapshot: DocumentSignatureSnapshot | null;
}> {
    const res = await apiClient.post(`/documents/${id}/lock`, { signatureId, documentHash });
    return res.data;
}

export async function updateSignatureLayout(
    id: string,
    position: { x: number; y: number },
): Promise<DocumentSummary & { signatureSnapshot: DocumentSignatureSnapshot | null }> {
    const res = await apiClient.patch(`/documents/${id}/signature-layout`, position);
    return res.data;
}

/**
 * Triggers a PDF export for a locked document and initiates a browser download.
 * The PDF places the signature strip at the same normalized x/y as the HTML render.
 */
export async function exportDocumentAsPdf(id: string, title: string): Promise<void> {
    const res = await apiClient.get(`/documents/${id}/export/pdf`, {
        responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data as Blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title.replace(/[^a-zA-Z0-9-_]/g, '_')}-signed.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
}

export async function deleteDocument(id: string): Promise<{ deleted: boolean }> {
    const res = await apiClient.delete(`/documents/${id}`);
    return res.data;
}

export async function getVersions(id: string): Promise<DocumentVersion[]> {
    const res = await apiClient.get(`/documents/${id}/versions`);
    return res.data;
}

export async function restoreVersion(
    id: string,
    versionNumber: number,
): Promise<{ restored: boolean; versionNumber: number }> {
    const res = await apiClient.post(`/documents/${id}/versions/${versionNumber}/restore`);
    return res.data;
}

export async function shareDocumentAccess(
    id: string,
    data: {
        userId: string;
        permissions: CollaboratorPermission[];
        note?: string;
        expiresInDays?: number;
    },
): Promise<{
    id: string;
    userId: string;
    permissions: CollaboratorPermission[];
    invitationStatus: string;
    emailStatus: 'sent' | 'failed' | 'not_required';
}> {
    const res = await apiClient.post(`/documents/${id}/access`, data);
    return res.data;
}

export interface VerifyDocumentResponse {
    verified: boolean;
    documentId?: string;
    title?: string;
    contentHash?: string;
    signedBy?: { name: string };
    signedAt?: string;
    lockedAt?: string;
    message?: string;
}

export async function verifyDocument(id: string): Promise<VerifyDocumentResponse> {
    const res = await apiClient.get(`/documents/${id}/verify`);
    return res.data;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function listTemplates(params?: {
    category?: string;
    type?: DocumentType;
}): Promise<Template[]> {
    const res = await apiClient.get('/templates', { params });
    return res.data;
}

export async function getTemplate(id: string): Promise<Template> {
    const res = await apiClient.get(`/templates/${id}`);
    return res.data;
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export async function listFolders(): Promise<Folder[]> {
    const res = await apiClient.get('/folders');
    return res.data;
}

export async function createFolder(data: {
    name: string; parentFolderId?: string;
}): Promise<Folder> {
    const res = await apiClient.post('/folders', data);
    return res.data;
}

export async function renameFolder(id: string, name: string): Promise<Folder> {
    const res = await apiClient.patch(`/folders/${id}/rename`, { name });
    return res.data;
}

export async function deleteFolder(id: string): Promise<{ deleted: boolean }> {
    const res = await apiClient.delete(`/folders/${id}`);
    return res.data;
}
