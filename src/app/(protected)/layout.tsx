'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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

function isSessionUser(value: unknown): value is SessionUser {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
        typeof candidate.userId === 'string'
        && typeof candidate.email === 'string'
        && typeof candidate.surName === 'string'
        && typeof candidate.postNames === 'string'
        && typeof candidate.sex === 'string'
        && typeof candidate.isIdVerified === 'boolean'
        && typeof candidate.createdAt === 'string'
        && (typeof candidate.phoneNumber === 'string' || candidate.phoneNumber === null)
        && (typeof candidate.imageUrl === 'string' || candidate.imageUrl === null)
        && (typeof candidate.idVerifiedAt === 'string' || candidate.idVerifiedAt === null)
    );
}

function normalizeSessionUser(value: unknown): SessionUser | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    if (isSessionUser(value)) {
        return value;
    }

    const candidate = value as {
        id?: unknown;
        email?: unknown;
        phoneNumber?: unknown;
        isIdVerified?: unknown;
        idVerifiedAt?: unknown;
        createdAt?: unknown;
        profileImageUrl?: unknown;
        citizenIdentity?: {
            surName?: unknown;
            postNames?: unknown;
            sex?: unknown;
        } | null;
    };

    if (
        typeof candidate.id !== 'string'
        || typeof candidate.email !== 'string'
        || typeof candidate.isIdVerified !== 'boolean'
        || typeof candidate.createdAt !== 'string'
        || (typeof candidate.phoneNumber !== 'string' && candidate.phoneNumber !== null && candidate.phoneNumber !== undefined)
        || (typeof candidate.idVerifiedAt !== 'string' && candidate.idVerifiedAt !== null && candidate.idVerifiedAt !== undefined)
        || (typeof candidate.profileImageUrl !== 'string' && candidate.profileImageUrl !== null && candidate.profileImageUrl !== undefined)
    ) {
        return null;
    }

    return {
        userId: candidate.id,
        email: candidate.email,
        phoneNumber: candidate.phoneNumber ?? null,
        imageUrl: candidate.profileImageUrl ?? null,
        surName:
            typeof candidate.citizenIdentity?.surName === 'string'
                ? candidate.citizenIdentity.surName
                : '',
        postNames:
            typeof candidate.citizenIdentity?.postNames === 'string'
                ? candidate.citizenIdentity.postNames
                : '',
        sex:
            typeof candidate.citizenIdentity?.sex === 'string'
                ? candidate.citizenIdentity.sex
                : '',
        isIdVerified: candidate.isIdVerified,
        idVerifiedAt: candidate.idVerifiedAt ?? null,
        createdAt: candidate.createdAt,
    };
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        let ignore = false;

        setLoading(true);
        setSessionError(null);

        fetchCurrentUser().then((result) => {
            if (ignore) return;

            if (result.status === 'authenticated') {
                const normalizedUser = normalizeSessionUser(result.user);

                if (!normalizedUser) {
                    setSessionError('The authentication service returned an unexpected user profile.');
                    setLoading(false);
                    return;
                }

                setUser(normalizedUser);
                setLoading(false);
                return;
            }

            setUser(null);

            if (result.status === 'unauthenticated') {
                const intendedPath =
                    `${window.location.pathname}${window.location.search}${window.location.hash}`;
                redirectToLogin(intendedPath);
                return;
            }

            setSessionError(result.message);
            setLoading(false);
        });

        return () => {
            ignore = true;
        };
    }, [retryKey]);

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

    if (sessionError) {
        return (
            <div
                style={{
                    minHeight: '100dvh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                }}
            >
                <div
                    className="glass-strong animate-scale-in"
                    style={{
                        width: '100%',
                        maxWidth: 460,
                        borderRadius: 'var(--radius-xl)',
                        padding: 32,
                        display: 'grid',
                        gap: 18,
                        textAlign: 'center',
                    }}
                >
                    <div>
                        <p
                            style={{
                                margin: '0 0 8px',
                                fontSize: 20,
                                fontWeight: 700,
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            Unable to restore your session
                        </p>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 13,
                                color: 'var(--color-text-secondary)',
                                lineHeight: 1.6,
                            }}
                        >
                            {sessionError}
                        </p>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                        }}
                    >
                        <button
                            onClick={() => setRetryKey((value) => value + 1)}
                            className="btn-primary"
                            style={{ minWidth: 140 }}
                        >
                            Try again
                        </button>
                        <button
                            onClick={() => {
                                const intendedPath =
                                    `${window.location.pathname}${window.location.search}${window.location.hash}`;
                                redirectToLogin(intendedPath);
                            }}
                            className="btn-ghost"
                            style={{ minWidth: 140 }}
                        >
                            Sign in again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    const showHeader = !/^\/documents\/[^/]+\/edit$/.test(pathname);

    return (
        <UserContext.Provider value={user}>
            <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
                {showHeader && <DocsHeader user={user} />}
                <main style={{ flex: 1, padding: '20px clamp(18px, 3.4vw, 38px) 42px' }}>
                    {children}
                </main>
            </div>
        </UserContext.Provider>
    );
}
