'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import { DocsSidebar } from '@/components/layout/DocsSidebar';
import { DocsHeader } from '@/components/layout/DocsHeader';

const SIDEBAR_W = 260;
const COLLAPSED_W = 64;

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const { isHydrated, isLoggedIn } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!isHydrated) return;
        if (!isLoggedIn()) router.replace('/login');
    }, [isHydrated, isLoggedIn, router]);

    if (!isHydrated) {
        return (
            <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(91,35,255,0.2)', borderTopColor: 'var(--color-primary)', animation: 'btn-spin 0.7s linear infinite' }} />
            </div>
        );
    }

    if (!isLoggedIn()) return null;

    return (
        <div style={{ minHeight: '100dvh', display: 'flex' }}>
            <DocsSidebar />
            <div
                id="docs-main"
                style={{
                    flex: 1,
                    marginLeft: SIDEBAR_W,
                    minHeight: '100dvh',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'margin-left 250ms cubic-bezier(0.4,0,0.2,1)',
                }}
            >
                <DocsHeader />
                <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1200 }}>
                    {children}
                </main>
            </div>
            <SidebarSync expanded={SIDEBAR_W} collapsed={COLLAPSED_W} />
            <style>{`@media(max-width:767px){#docs-main{margin-left:0!important;}}`}</style>
        </div>
    );
}

import { useSidebarStore } from '@/lib/store/sidebar.store';

function SidebarSync({ expanded, collapsed }: { expanded: number; collapsed: number }) {
    const isCollapsed = useSidebarStore((s) => s.collapsed);
    useEffect(() => {
        const el = document.getElementById('docs-main');
        if (el) el.style.marginLeft = `${isCollapsed ? collapsed : expanded}px`;
    }, [isCollapsed, expanded, collapsed]);
    return null;
}