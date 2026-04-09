'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { fetchCurrentUser, redirectToLogin } from '@/lib/session';
import { DocsHeader } from '@/components/layout/DocsHeader';

// The user profile type — matches what app/app's /api/me returns
export interface SessionUser {
    userId: string;
    email: string;
    phoneNumber: string | null;
    imageUrl: string | null;
    surName: string;
    postNames: string;
    sex: string;
    isIdVerified: boolean;
    idVerifiedAt: string | null;
    createdAt: string;
}

const UserContext = createContext<SessionUser | null>(null);
export function useSessionUser() { return useContext(UserContext); }

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCurrentUser().then((u) => {
            if (!u) {
                redirectToLogin(window.location.pathname);
                return;
            }

            setUser(u?.data ?? u);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div
                style={{
                    minHeight: '100dvh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border: '3px solid rgba(91,35,255,0.2)',
                        borderTopColor: 'var(--color-primary)',
                        animation: 'btn-spin 0.7s linear infinite',
                    }}
                />
            </div>
        );
    }

    if (!user) return null;

    return (
        <UserContext.Provider value={user}>
            <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
                <DocsHeader user={user} />
                <main style={{ flex: 1, padding: '20px clamp(18px, 3.4vw, 38px) 42px' }}>
                    {children}
                </main>
            </div>
        </UserContext.Provider>
    );
}
