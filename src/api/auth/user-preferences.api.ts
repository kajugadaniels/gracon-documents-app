/**
 * Client helpers for auth-owned user invitation preferences.
 */
import { authClient } from '@/api/client';

export type UserInviteVerificationPreference =
    | 'NO_VERIFICATION'
    | 'EMAIL_OTP'
    | 'IDENTITY_VERIFICATION';

export interface UserPreferencesResponse {
    defaultDocumentInviteVerifications: UserInviteVerificationPreference[];
    defaultMeetingInviteVerifications: UserInviteVerificationPreference[];
}

/**
 * Fetches the current user's cross-platform invitation defaults through the
 * documents app proxy route.
 */
export const getUserPreferencesApi = () =>
    authClient.get<UserPreferencesResponse>('/users/preferences');
