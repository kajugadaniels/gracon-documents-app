'use client';

import { useEffect, useState } from 'react';
import { fetchCurrentUser, redirectToLogin } from '@/lib/session';
import { DocsSidebar } from '@/components/layout/DocsSidebar';
import { DocsHeader } from '@/components/layout/DocsHeader';
import { useSidebarStore, hydrateSidebar } from '@/lib/store/sidebar.store';

const SIDEBAR_W = 260;
const COLLAPSED_W = 64;

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

// Shared context so child components can read the user
import { createContext, useContext } from 'react';

const UserContext = createContext<SessionUser | null>(null);
export function useSessionUser() { return useContext(UserContext); }

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        hydrateSidebar();

        fetchCurrentUser().then((u) => {
            if (!u) {
                // No valid session in app/app — redirect to login
                redirectToLogin(window.location.pathname);
                return;
            }
            setUser(u?.data ?? u); // handle both { data: user } and { ...user } response shapes
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(91,35,255,0.2)', borderTopColor: 'var(--color-primary)', animation: 'btn-spin 0.7s linear infinite' }} />
            </div>
        );
    }

    if (!user) return null;

    return (
        <UserContext.Provider value={user}>
            <div style={{ minHeight: '100dvh', display: 'flex' }}>
                <DocsSidebar user={user} />
                <div
                    id="docs-main"
                    style={{ flex: 1, marginLeft: SIDEBAR_W, minHeight: '100dvh', display: 'flex', flexDirection: 'column', transition: 'margin-left 250ms cubic-bezier(0.4,0,0.2,1)' }}
                >
                    <DocsHeader user={user} />
                    <main style={{ flex: 1, padding: '28px 32px' }}>
                        {children}
                    </main>
                </div>
                <SidebarSync expanded={SIDEBAR_W} collapsed={COLLAPSED_W} />
                <style>{`@media(max-width:767px){#docs-main{margin-left:0!important;}}`}</style>
            </div>
        </UserContext.Provider>
    );
}

function SidebarSync({ expanded, collapsed }: { expanded: number; collapsed: number }) {
    const isCollapsed = useSidebarStore((s) => s.collapsed);
    useEffect(() => {
        const el = document.getElementById('docs-main');
        if (el) el.style.marginLeft = `${isCollapsed ? collapsed : expanded}px`;
    }, [isCollapsed, expanded, collapsed]);
    return null;
}