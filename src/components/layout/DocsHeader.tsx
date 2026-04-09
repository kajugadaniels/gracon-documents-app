/**
 * DocsHeader
 *
 * Google Docs-style sticky header. Single compact bar with logo, prominent
 * search, action buttons, and user avatar. Navigation tabs rendered below
 * as a minimal underline strip — active tab uses a primary-colour bottom border.
 */
'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SessionUser } from '@/app/(protected)/layout';
import { APP_URL } from '@/lib/session';

const NAV_ITEMS = [
    {
        href: '/documents',
        label: 'My documents',
        description: 'Everything you are drafting right now',
        isActive: (pathname: string, status: string | null) =>
            pathname.startsWith('/documents') && status !== 'LOCKED',
    },
    {
        href: '/templates',
        label: 'Templates',
        description: 'Reusable foundations for repeat work',
        isActive: (pathname: string) => pathname.startsWith('/templates'),
    },
    {
        href: '/documents?status=LOCKED',
        label: 'Signed',
        description: 'Completed and sealed records',
        isActive: (pathname: string, status: string | null) =>
            pathname === '/documents' && status === 'LOCKED',
    },
] as const;

export function DocsHeader({ user }: { user: SessionUser }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('search') ?? '');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    useEffect(() => {
        setQuery(searchParams.get('search') ?? '');
    }, [searchParams]);

    function logout() {
        document.cookie = 'g360_at=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'g360_rt=; path=/; max-age=0; SameSite=Lax';
        window.location.href = `${APP_URL}/logout`;
    }

    function submitSearch(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const value = query.trim();
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set('search', value); else params.delete('search');
        const target = pathname !== '/documents' ? '/documents' : pathname;
        router.push(`${target}${params.toString() ? `?${params.toString()}` : ''}`);
    }

    function clearSearch() {
        setQuery('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('search');
        router.push(`/documents${params.toString() ? `?${params.toString()}` : ''}`);
    }

    const initials =
        `${user.postNames?.[0] ?? ''}${user.surName?.[0] ?? ''}`.toUpperCase() || 'U';
    const status = searchParams.get('status');

    return (
        <header className="docs-header">
            {/* ── Main bar ── */}
            <div className="docs-header__bar">
                {/* Logo */}
                <Link href="/documents" className="docs-header__logo" aria-label="Gracon Docs home">
                    <div className="docs-header__logo-mark">G</div>
                    <div className="docs-header__logo-text">
                        <span className="docs-header__logo-eyebrow">Gracon 360</span>
                        <span className="docs-header__logo-name">Documents</span>
                    </div>
                </Link>

                {/* Search — hidden on mobile, toggled by button */}
                <form
                    onSubmit={submitSearch}
                    className="docs-header__search"
                    role="search"
                    aria-label="Search documents"
                >
                    <span className="docs-header__search-icon" aria-hidden>⌕</span>
                    <input
                        type="search"
                        placeholder="Search documents…"
                        className="input-glass"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Search documents"
                    />
                </form>

                {/* Right-side actions */}
                <div className="docs-header__actions">
                    {/* Mobile search toggle */}
                    <button
                        className="btn-icon docs-header__mobile-search-btn"
                        onClick={() => setMobileSearchOpen((v) => !v)}
                        aria-label="Search"
                    >
                        ⌕
                    </button>

                    <Link
                        href="/documents/new?type=RICH_TEXT"
                        className="btn-primary"
                        style={{ textDecoration: 'none', padding: '10px 20px', fontSize: 13 }}
                    >
                        + New
                    </Link>

                    <Link
                        href="/verify"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost docs-header__verify"
                        style={{ textDecoration: 'none', padding: '9px 16px', fontSize: 13 }}
                    >
                        Verify
                    </Link>

                    {/* Avatar — click to sign out */}
                    <button
                        onClick={logout}
                        className="docs-header__avatar"
                        title={`${user.postNames} ${user.surName} — click to sign out`}
                        aria-label="Sign out"
                    >
                        {user.imageUrl ? (
                            <img
                                src={user.imageUrl}
                                alt={initials}
                                width={38}
                                height={38}
                                style={{ borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                            />
                        ) : (
                            <span>{initials}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Mobile search overlay ── */}
            {mobileSearchOpen && (
                <div
                    style={{
                        padding: '10px 16px',
                        borderTop: '1px solid var(--color-border)',
                        background: 'rgba(255,255,255,0.98)',
                    }}
                >
                    <form onSubmit={(e) => { submitSearch(e); setMobileSearchOpen(false); }} style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--color-text-muted)', pointerEvents: 'none' }}>⌕</span>
                            <input
                                type="search"
                                placeholder="Search documents…"
                                className="input-glass"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                                style={{ paddingLeft: 40, height: 44, borderRadius: 9999, fontSize: 14 }}
                            />
                        </div>
                        {query && (
                            <button type="button" onClick={() => { clearSearch(); setMobileSearchOpen(false); }} className="btn-ghost" style={{ padding: '9px 14px', fontSize: 12, flexShrink: 0 }}>
                                Clear
                            </button>
                        )}
                    </form>
                </div>
            )}

            {/* ── Nav strip ── */}
            <nav className="docs-header__nav" aria-label="Document sections">
                {NAV_ITEMS.map((item) => {
                    const active = item.isActive(pathname, status);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={item.description}
                            className={`docs-header__nav-item${active ? ' docs-header__nav-item--active' : ''}`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}
