/**
 * DocumentAccessTransitionBanner
 *
 * Shows a short blocking notice when the user's access changes remotely and
 * the editor is about to redirect them away from the current document.
 */
'use client';

interface DocumentAccessTransitionBannerProps {
    message: string;
}

/** Renders a temporary high-priority banner during remote access transitions. */
export function DocumentAccessTransitionBanner({
    message,
}: DocumentAccessTransitionBannerProps) {
    return (
        <div
            className="ded-status-banner ded-status-banner--revoked"
            role="status"
            aria-live="assertive"
        >
            <span className="ded-status-banner__dot" aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
}
