'use client';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const hydrate = useAuthStore((s) => s.hydrate);
    const hydrated = useRef(false);

    useEffect(() => {
        if (!hydrated.current) {
            hydrated.current = true;
            hydrate();
        }
    }, [hydrate]);

    return <>{children}</>;
}