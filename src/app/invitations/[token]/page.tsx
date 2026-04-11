import type { Metadata } from 'next';
import { InvitationAcceptanceView } from '@/components/pages/invitations/InvitationAcceptanceView';

export const metadata: Metadata = {
    title: 'Document Invitation — Gracon 360 Documents',
    description: 'Review and accept a secure document-sharing invitation.',
};

type Props = {
    params: Promise<{
        token: string;
    }>;
};

export default async function InvitationPage({ params }: Props) {
    const { token } = await params;

    return <InvitationAcceptanceView token={token} />;
}
