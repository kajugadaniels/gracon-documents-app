/**
 * search-users.api.ts
 *
 * Searches active, verified users by email, platform ID, or citizen ID.
 * Used by the Share dialog to look up collaborators before adding them.
 *
 * Calls the documents service (/api/v1/users/search) — not the auth service.
 * The endpoint is protected by VerifiedUserGuard; a valid full JWT is required.
 *
 * The query must be at least 5 characters — enforced by both this function
 * and the documents service endpoint.
 */

import { apiClient } from '@/api/client';

export interface UserSearchResult {
    id: string;
    email: string;
    surName: string | null;
    postNames: string | null;
    imageUrl: string | null;
    matchedBy: 'EMAIL' | 'PLATFORM_ID' | 'CITIZEN_ID';
}

/**
 * Returns users whose email contains the provided query string or whose
 * platform/citizen ID exactly matches it.
 *
 * @param q  Partial email, or a full platform/citizen ID — must be at least 5 characters.
 * @returns  Array of matching user summaries.
 */
export async function searchUsers(q: string): Promise<UserSearchResult[]> {
    const res = await apiClient.get<UserSearchResult[]>('/users/search', {
        params: { q },
    });
    return res.data;
}
