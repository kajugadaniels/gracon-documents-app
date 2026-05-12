/**
 * Tracks whether the current user has an active digital-signature certificate.
 *
 * The status is refreshed when the editor regains focus so users who issue a
 * certificate in app/app can return here without a full page reload.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    getDigitalCertificateStatus,
    type DigitalCertificateStatus,
} from '@/api/signature.api';

export type DigitalCertificateActionStatus =
    | DigitalCertificateStatus
    | 'checking'
    | 'not-required';

/**
 * Checks digital-certificate availability only when signing actions are visible.
 */
export function useDigitalCertificateStatus(enabled: boolean) {
    const [status, setStatus] = useState<DigitalCertificateActionStatus>('checking');

    const refresh = useCallback(async () => {
        if (!enabled) return;

        setStatus('checking');
        setStatus(await getDigitalCertificateStatus());
    }, [enabled]);

    useEffect(() => {
        if (!enabled) return undefined;

        let ignore = false;

        getDigitalCertificateStatus().then((nextStatus) => {
            if (!ignore) setStatus(nextStatus);
        });

        return () => { ignore = true; };
    }, [enabled]);

    useEffect(() => {
        if (!enabled) return undefined;

        const handleFocus = () => { void refresh(); };
        window.addEventListener('focus', handleFocus);

        return () => window.removeEventListener('focus', handleFocus);
    }, [enabled, refresh]);

    return { status: enabled ? status : 'not-required', refresh };
}
