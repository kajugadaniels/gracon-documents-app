'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import type { SessionUser } from '@/app/(protected)/layout';
import { useSidebarStore, hydrateSidebar } from '@/lib/store/sidebar.store';

const NAV = [
    { href: '/documents', label: 'My Documents', icon: '📄', exact: true },
    { href: '/templates', label: 'Templates', icon: '📋', exact: true },
    { href: '/documents?status=LOCKED', label: 'Signed', icon: '✅', exact: false },
];

export function DocsSidebar({ user }: { user: SessionUser }) {
    const pathname = usePathname();
    const collapsed = useSidebarStore((s) => s.collapsed);
    const mobileOpen = useSidebarStore((s) => s.mobileOpen);
    const toggle = useSidebarStore((s) => s.toggle);
    const closeMobile = useSidebarStore((s) => s.closeMobile);

    useEffect(() => { hydrateSidebar(); }, []);

    const initials = user
        ? `${user.postNames?.[0] ?? ''}${user.surName?.[0] ?? ''}`.toUpperCase()
        : '??';

    const w = collapsed ? 64 : 260;

    function isActive(href: string, exact: boolean) {
        if (exact) return pathname === href;
        return pathname.startsWith(href.split('?')[0]);
    }

    return (
        <>
            {mobileOpen && (
                <div onClick={closeMobile} aria-hidden style={{
                    position: 'fixed', inset: 0, background: 'rgba(91,35,255,0.08)',
                    backdropFilter: 'blur(4px)', zIndex: 40,
                }} />
            )}

            <aside style={{
                position: 'fixed', top: 0, left: 0, height: '100dvh', width: w, zIndex: 50,
                display: 'flex', flexDirection: 'column',
                background: 'var(--glass-bg)', backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRight: '1px solid var(--color-border)',
                boxShadow: '4px 0 24px rgba(91,35,255,0.06)',
                transition: 'width 250ms cubic-bezier(0.4,0,0.2,1)',
                overflow: 'hidden',
            }}>

                {/* Top bar */}
                <div style={{
                    height: 64, display: 'flex', alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    padding: collapsed ? '0 14px' : '0 16px 0 20px',
                    borderBottom: '1px solid var(--color-border)', flexShrink: 0,
                }}>
                    {!collapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>G</div>
                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Documents</span>
                        </div>
                    )}
                    <button onClick={toggle} aria-label={collapsed ? 'Expand' : 'Collapse'}
                        style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: 'transform 250ms ease', transform: collapsed ? 'rotate(180deg)' : 'none' }}>
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                </div>

                {/* New document button */}
                {!collapsed && (
                    <div style={{ padding: '12px 12px 4px' }}>
                        <Link href="/documents/new" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 0', borderRadius: 10, background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600, boxShadow: 'var(--btn-shadow-rest)' }}>
                            <span style={{ fontSize: 16 }}>+</span> New Document
                        </Link>
                    </div>
                )}

                {/* Nav */}
                <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {NAV.map(({ href, label, icon, exact }) => {
                        const active = isActive(href, exact);
                        return (
                            <Link key={href} href={href} onClick={closeMobile} title={collapsed ? label : undefined}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: collapsed ? '10px 0' : '10px 12px',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    borderRadius: 10, textDecoration: 'none',
                                    fontWeight: active ? 600 : 400, fontSize: 14,
                                    color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                    background: active ? 'var(--color-primary-subtle)' : 'transparent',
                                    border: `1px solid ${active ? 'var(--color-border-primary)' : 'transparent'}`,
                                    transition: 'all 150ms ease', whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(91,35,255,0.05)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-primary)'; } }}
                                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-secondary)'; } }}
                            >
                                <span style={{ fontSize: 17, flexShrink: 0 }}>{icon}</span>
                                {!collapsed && <span>{label}</span>}
                                {active && !collapsed && <span style={{ position: 'absolute', right: 12, width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)' }} />}
                            </Link>
                        );
                    })}
                </nav>

                {/* User strip */}
                <div style={{ padding: collapsed ? '12px 10px' : '12px 14px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, justifyContent: collapsed ? 'center' : 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-subtle)', border: '2px solid var(--color-border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>
                        {initials}
                    </div>
                    {!collapsed && (
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user ? `${user.postNames} ${user.surName}`.trim() : ''}
                            </p>
                            <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user?.email ?? ''}
                            </p>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
