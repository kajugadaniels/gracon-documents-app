/**
 * Document share state helpers.
 *
 * Merges fresh share/access metadata into the current document model without
 * overwriting the in-memory editor content the user may still be typing into.
 */

import type { DocumentDetail } from '@/api/documents.api';

/** Preserves editor content while applying updated sharing and signing metadata. */
export function mergeDocumentShareState(
    current: DocumentDetail,
    incoming: DocumentDetail,
): DocumentDetail {
    return {
        ...current,
        access: incoming.access,
        collaborators: incoming.collaborators,
        signatureRequests: incoming.signatureRequests,
        pendingSignatureCount: incoming.pendingSignatureCount,
        signatureSnapshot: incoming.signatureSnapshot,
        completedSignatures: incoming.completedSignatures,
        status: incoming.status,
        signedAt: incoming.signedAt,
        lockedAt: incoming.lockedAt,
        updatedAt: incoming.updatedAt,
        contentHash: incoming.contentHash,
    };
}
