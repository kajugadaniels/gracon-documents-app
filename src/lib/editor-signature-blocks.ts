import type { SessionUser } from '@/app/(protected)/layout';
import type {
    DocumentCompletedSignature,
    DocumentDetail,
    DocumentSignatureSnapshot,
} from '@/api/documents.api';

export interface SignatureBlockSigner {
    accessId: string;
    userId: string;
    displayName: string;
    email: string;
    isOwner?: boolean;
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

function buildOwnerSigner(owner: SessionUser): SignatureBlockSigner {
    return {
        accessId: 'owner',
        userId: owner.userId,
        displayName: getOwnerDisplayName(owner),
        email: owner.email,
        isOwner: true,
    };
}

function canUseSnapshotForSigner(
    snapshot: DocumentSignatureSnapshot | null | undefined,
    signer: SignatureBlockSigner,
    signature: DocumentCompletedSignature | undefined,
    signerCount: number,
) {
    if (!snapshot?.imageUrl && !snapshot?.signedAt && !snapshot?.signatureId) {
        return false;
    }

    if (signerCount === 1) return true;
    if (signature?.signatureId && signature.signatureId === snapshot.signatureId) return true;
    if (signature?.isOwner) return true;

    return Boolean(
        snapshot.signerName &&
        signer.displayName.trim().toLowerCase() === snapshot.signerName.trim().toLowerCase(),
    );
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
                isOwner: isOwnerRequest,
                signatureId: request.personalSignedDocumentId,
                signedAt: request.signedAt,
            };
        });
    }

    const ownerSigner = owner && doc.access?.isOwner !== false
        ? buildOwnerSigner(owner)
        : null;

    const invitedSigners = doc.collaborators
        .filter((collaborator) => (
            collaborator.isActive &&
            collaborator.permissions.includes('SIGN') &&
            collaborator.invitationStatus !== 'DECLINED' &&
            collaborator.invitationStatus !== 'REVOKED'
            && collaborator.userId !== ownerSigner?.userId
        ))
        .map((collaborator) => ({
            accessId: collaborator.id,
            userId: collaborator.userId,
            displayName: collaborator.user.displayName || collaborator.user.email,
            email: collaborator.user.email,
            isOwner: false,
        }));

    if (ownerSigner) return [ownerSigner, ...invitedSigners];

    return invitedSigners;
}

export function getSignatureBlockSignerOrder(content: unknown): string[] {
    const signerIds: string[] = [];

    function visit(value: unknown) {
        if (!value || typeof value !== 'object') return;

        const node = value as {
            type?: unknown;
            attrs?: { signerUserId?: unknown };
            content?: unknown;
        };

        if (node.type === 'signatureBlock' && typeof node.attrs?.signerUserId === 'string') {
            signerIds.push(node.attrs.signerUserId);
        }

        if (Array.isArray(node.content)) {
            node.content.forEach(visit);
        }
    }

    visit(content);
    return signerIds;
}

export function hasSignatureBlockForUser(content: unknown, userId: string | null | undefined) {
    if (!userId) return false;
    return getSignatureBlockSignerOrder(content).includes(userId);
}

/**
 * Converts signer records to persisted TipTap signature-block attrs.
 */
export function buildSignatureBlockInserts(
    signers: SignatureBlockSigner[],
    completedSignatures: DocumentCompletedSignature[],
    signatureSnapshot?: DocumentSignatureSnapshot | null,
): SignatureBlockInsert[] {
    return signers.map((signer) => {
        const signature = getCompletedSignatureForSigner(completedSignatures, signer.userId);
        const snapshotMatchesSigner = canUseSnapshotForSigner(
            signatureSnapshot,
            signer,
            signature,
            signers.length,
        );
        const snapshotImageUrl = snapshotMatchesSigner ? signatureSnapshot?.imageUrl : null;
        const snapshotSignedAt = snapshotMatchesSigner ? signatureSnapshot?.signedAt : null;
        const snapshotSignatureId = snapshotMatchesSigner ? signatureSnapshot?.signatureId : null;

        return {
            blockId: `signature-${signer.userId}`,
            label: signer.displayName,
            signerRole: 'Signer',
            required: true,
            signerUserId: signer.userId,
            signerAccessId: signer.accessId,
            signerName: signer.displayName,
            signerEmail: signer.email,
            signatureId: signature?.signatureId
                ?? signer.signatureId
                ?? snapshotSignatureId
                ?? undefined,
            signedAt: signature?.signedAt
                ?? signer.signedAt
                ?? snapshotSignedAt
                ?? undefined,
            signatureImageUrl: signature?.imageUrl ?? snapshotImageUrl ?? null,
        };
    });
}
