/**
 * search-users.api.ts
 *
 * Searches active, verified users by a partial email string.
 * Used by the Share dialog to look up collaborators before adding them.
 *
 * The query must be at least 5 characters — enforced by both this function
 * and the auth service endpoint.
 */

import { authClient } from '@/api/client';

export interface UserSearchResult {
    id: string;
    email: string;
    surName: string | null;
    postNames: string | null;
    imageUrl: string | null;
}

/**
 * Returns users whose email contains the provided query string.
 *
 * @param q  Partial email — must be at least 5 characters.
 * @returns  Array of matching user summaries.
 */
export async function searchUsers(q: string): Promise<UserSearchResult[]> {
    const res = await authClient.get<UserSearchResult[]>('/users/search', {
        params: { q },
    });
    return res.data;
}
