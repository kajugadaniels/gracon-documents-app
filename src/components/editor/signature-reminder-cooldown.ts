/**
 * Signature reminder cooldown helpers.
 *
 * Keeps reminder rate-limit parsing and countdown formatting outside the
 * signing progress component so the UI remains focused on rendering state.
 */

const REMINDER_COOLDOWN_MS = 15 * 60 * 1000;

export const REMINDER_CLOCK_TICK_MS = 30 * 1000;

type ReminderApiError = {
    response?: {
        status?: number;
        data?: {
            message?: unknown;
            retryAt?: unknown;
            retryAfter?: unknown;
        };
        headers?: Record<string, unknown>;
    };
};

/** Formats an ISO timestamp for human-readable reminder retry messages. */
export function formatReminderTime(value: string): string {
    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

/** Returns a short countdown label for an active reminder cooldown. */
export function formatRemainingTime(value: string, now: number): string {
    const retryAt = new Date(value).getTime();
    const remainingMs = retryAt - now;

    if (!Number.isFinite(retryAt) || remainingMs <= 0) {
        return 'now';
    }

    const minutes = Math.ceil(remainingMs / 60_000);
    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const leftoverMinutes = minutes % 60;
    return leftoverMinutes > 0 ? `${hours}h ${leftoverMinutes}m` : `${hours}h`;
}

/** Checks whether a timestamp exists and is still in the future. */
export function isFutureTimestamp(
    value: string | null | undefined,
    now: number,
): value is string {
    if (!value) return false;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) && timestamp > now;
}

/** Calculates the next allowed reminder time from a successful send timestamp. */
export function getReminderCooldownFromSentAt(sentAt: string): string {
    const sentTimestamp = new Date(sentAt).getTime();
    const baseTimestamp = Number.isFinite(sentTimestamp) ? sentTimestamp : Date.now();
    return new Date(baseTimestamp + REMINDER_COOLDOWN_MS).toISOString();
}

/** Extracts a safe API error message without exposing raw error objects. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
    const message = (error as ReminderApiError).response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
}

/** Reads structured 429 retry data from the documents API response. */
export function getReminderRetryAt(error: unknown): string | null {
    const response = (error as ReminderApiError).response;
    if (!response || response.status !== 429) {
        return null;
    }

    const retryAt = response.data?.retryAt;
    if (typeof retryAt === 'string' && isFutureTimestamp(retryAt, Date.now())) {
        return retryAt;
    }

    const retryAfter = response.data?.retryAfter ?? readRetryAfterHeader(response.headers);
    const retryAfterSeconds =
        typeof retryAfter === 'number' ? retryAfter : Number.parseInt(String(retryAfter), 10);

    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        return new Date(Date.now() + retryAfterSeconds * 1000).toISOString();
    }

    return null;
}

function readRetryAfterHeader(headers: Record<string, unknown> | undefined): unknown {
    return headers?.['retry-after'] ?? headers?.['Retry-After'];
}
