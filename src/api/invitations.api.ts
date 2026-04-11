import { apiClient } from './client';

export interface InvitationPreview {
    status: 'pending';
    requiresAuthentication: boolean;
    invitation: {
        permissions: string[];
        note: string | null;
        invitedAt: string;
        expiresAt: string | null;
    };
    sender: {
        email: string | null;
        displayName: string;
    };
    recipient: {
        maskedEmail: string;
    };
}

export interface InvitationReview {
    status: 'pending';
    document: {
        id: string;
        title: string;
    };
    invitation: {
        permissions: string[];
        note: string | null;
        invitedAt: string;
        expiresAt: string | null;
    };
    sender: {
        email: string | null;
        displayName: string;
    };
    recipient: {
        email: string;
        displayName: string;
    };
}

export async function getInvitationPreview(token: string): Promise<InvitationPreview> {
    const res = await apiClient.get(`/documents/invitations/${encodeURIComponent(token)}`);
    return res.data;
}

export async function getInvitationReview(token: string): Promise<InvitationReview> {
    const res = await apiClient.get(
        `/documents/invitations/${encodeURIComponent(token)}/review`,
    );
    return res.data;
}

export async function acceptInvitation(
    token: string,
): Promise<{ accepted: boolean; document: { id: string; title: string }; permissions: string[] }> {
    const res = await apiClient.post(
        `/documents/invitations/${encodeURIComponent(token)}/accept`,
    );
    return res.data;
}

export async function declineInvitation(
    token: string,
): Promise<{ declined: boolean; document: { id: string; title: string } }> {
    const res = await apiClient.post(
        `/documents/invitations/${encodeURIComponent(token)}/decline`,
    );
    return res.data;
}
