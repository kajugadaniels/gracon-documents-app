/**
 * Document share sync helpers.
 *
 * Broadcasts document-level sharing updates across browser tabs so access and
 * audit UI stays current without forcing a manual reload.
 */
'use client';

import { useEffect } from 'react';

const SHARE_SYNC_CHANNEL = 'gracon:document-share-sync';
const SHARE_SYNC_STORAGE_KEY = 'gracon:document-share-sync-event';
const TAB_ID_STORAGE_KEY = 'gracon:document-share-sync-tab-id';

type ShareSyncEvent = {
    documentId: string;
    senderId: string;
    createdAt: number;
};

/** Broadcasts a document sharing change to other open tabs for the same user. */
export function publishDocumentShareSync(documentId: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    const event = createShareSyncEvent(documentId);

    if (typeof window.BroadcastChannel !== 'undefined') {
        const channel = new window.BroadcastChannel(SHARE_SYNC_CHANNEL);
        channel.postMessage(event);
        channel.close();
        return;
    }

    try {
        localStorage.setItem(SHARE_SYNC_STORAGE_KEY, JSON.stringify(event));
        localStorage.removeItem(SHARE_SYNC_STORAGE_KEY);
    } catch {
        // localStorage can be unavailable in hardened/private browsing contexts
    }
}

/**
 * Subscribes the current tab to remote share updates for a single document.
 * The callback only fires for events emitted by other tabs.
 */
export function useDocumentShareSync(
    documentId: string,
    onRemoteSync: () => void,
): void {
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const tabId = getShareSyncTabId();
        const handleSyncEvent = (payload: unknown) => {
            const event = parseShareSyncEvent(payload);
            if (!event) {
                return;
            }

            if (event.documentId !== documentId || event.senderId === tabId) {
                return;
            }

            onRemoteSync();
        };

        let channel: BroadcastChannel | null = null;
        if (typeof window.BroadcastChannel !== 'undefined') {
            channel = new window.BroadcastChannel(SHARE_SYNC_CHANNEL);
            channel.onmessage = (message) => handleSyncEvent(message.data);
        }

        const handleStorage = (event: StorageEvent) => {
            if (event.key !== SHARE_SYNC_STORAGE_KEY || !event.newValue) {
                return;
            }

            try {
                handleSyncEvent(JSON.parse(event.newValue));
            } catch {
                // ignore malformed cross-tab payloads
            }
        };

        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('storage', handleStorage);
            channel?.close();
        };
    }, [documentId, onRemoteSync]);
}

function createShareSyncEvent(documentId: string): ShareSyncEvent {
    return {
        documentId,
        senderId: getShareSyncTabId(),
        createdAt: Date.now(),
    };
}

function parseShareSyncEvent(payload: unknown): ShareSyncEvent | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return null;
    }

    const candidate = payload as Record<string, unknown>;
    if (
        typeof candidate.documentId !== 'string' ||
        typeof candidate.senderId !== 'string' ||
        typeof candidate.createdAt !== 'number'
    ) {
        return null;
    }

    return {
        documentId: candidate.documentId,
        senderId: candidate.senderId,
        createdAt: candidate.createdAt,
    };
}

function getShareSyncTabId(): string {
    if (typeof window === 'undefined') {
        return 'server';
    }

    const existing = window.sessionStorage.getItem(TAB_ID_STORAGE_KEY);
    if (existing) {
        return existing;
    }

    const tabId =
        typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(TAB_ID_STORAGE_KEY, tabId);
    return tabId;
}
