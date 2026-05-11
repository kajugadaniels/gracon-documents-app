import type { SessionUser } from '@/app/(protected)/layout';
import type { DocumentCompletedSignature, DocumentDetail } from '@/api/documents.api';

export interface SignatureBlockSigner {
    accessId: string;
    userId: string;
    displayName: string;
    email: string;
    signatureId?: string | null;
    signedAt?: string | null;
}

export interface SignatureBlockInsert {
    blockId: string;
    label: string;
    signerRole: string;
    required: boolean;
    signerUserId: string;
    signerAccessId: string;
    signerName: string;
    signerEmail: string;
    signatureId?: string;
    signedAt?: string;
    signatureImageUrl?: string | null;
}

function getOwnerDisplayName(user: SessionUser): string {
    return [user.postNames, user.surName].filter(Boolean).join(' ').trim() || user.email;
}

function getCompletedSignatureForSigner(
    completedSignatures: DocumentCompletedSignature[],
    signerUserId: string,
) {
    return completedSignatures.find((signature) => signature.signerId === signerUserId);
}

/**
 * Returns the signer set used when preparing inline signature blocks.
 */
export function getSignatureBlockSigners(
    doc: DocumentDetail,
    owner: SessionUser | null,
): SignatureBlockSigner[] {
    if (doc.signatureRequests.length > 0) {
        return doc.signatureRequests.map((request, index) => {
            const requestedUser = request.requestedUser;
            const isOwnerRequest = owner?.userId === request.requestedUserId;
            const displayName = requestedUser
                ? requestedUser.displayName || requestedUser.email
                : isOwnerRequest && owner
                    ? getOwnerDisplayName(owner)
                    : `Signer ${index + 1}`;
            const email = requestedUser?.email ?? (isOwnerRequest ? owner?.email : '') ?? '';

            return {
                accessId: request.id,
                userId: request.requestedUserId,
                displayName,
                email,
                signatureId: request.personalSignedDocumentId,
                signedAt: request.signedAt,
            };
        });
    }

    const invitedSigners = doc.collaborators
        .filter((collaborator) => (
            collaborator.isActive &&
            collaborator.permissions.includes('SIGN') &&
            collaborator.invitationStatus !== 'DECLINED' &&
            collaborator.invitationStatus !== 'REVOKED'
        ))
        .map((collaborator) => ({
            accessId: collaborator.id,
            userId: collaborator.userId,
            displayName: collaborator.user.displayName || collaborator.user.email,
            email: collaborator.user.email,
        }));

    if (invitedSigners.length > 0) return invitedSigners;
    if (!owner || doc.access?.isOwner === false) return [];

    return [{
        accessId: 'owner',
        userId: owner.userId,
        displayName: getOwnerDisplayName(owner),
        email: owner.email,
    }];
}

/**
 * Converts signer records to persisted TipTap signature-block attrs.
 */
export function buildSignatureBlockInserts(
    signers: SignatureBlockSigner[],
    completedSignatures: DocumentCompletedSignature[],
): SignatureBlockInsert[] {
    return signers.map((signer, index) => {
        const signature = getCompletedSignatureForSigner(completedSignatures, signer.userId);

        return {
            blockId: `signature-${signer.userId}-${index + 1}`,
            label: signer.displayName,
            signerRole: 'Signer',
            required: true,
            signerUserId: signer.userId,
            signerAccessId: signer.accessId,
            signerName: signer.displayName,
            signerEmail: signer.email,
            signatureId: signature?.signatureId ?? signer.signatureId ?? undefined,
            signedAt: signature?.signedAt ?? signer.signedAt ?? undefined,
            signatureImageUrl: signature?.imageUrl ?? null,
        };
    });
}
