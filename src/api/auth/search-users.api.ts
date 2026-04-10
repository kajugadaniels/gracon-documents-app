/**
 * search-users.api.ts
 *
 * Searches active, verified users by email or exact numeric ID.
 * Used by the Share dialog to look up collaborators before adding them.
 *
 * Calls the documents service (/api/v1/users/search) — not the auth service.
 * The endpoint is protected by VerifiedUserGuard; a valid full JWT is required.
 *
 * Email search requires at least 5 characters. Numeric-ID search requires the
 * full Platform ID (11 digits) or Citizen ID (16 digits).
 */

import { apiClient } from '@/api/client';

export type UserSearchMode = 'email' | 'id';

export interface UserSearchResult {
    id: string;
    email: string;
    surName: string | null;
    postNames: string | null;
    imageUrl: string | null;
    matchedBy: 'EMAIL' | 'PLATFORM_ID' | 'CITIZEN_ID';
}

/**
 * Returns users by either partial email or exact numeric ID, depending on mode.
 *
 * @param q  Query string appropriate for the selected mode.
 * @param mode  Explicit search mode selected by the user.
 * @returns  Array of matching user summaries.
 */
export async function searchUsers(
    q: string,
    mode: UserSearchMode,
): Promise<UserSearchResult[]> {
    const res = await apiClient.get<UserSearchResult[]>('/users/search', {
        params: { q, mode },
    });
    return res.data;
}
