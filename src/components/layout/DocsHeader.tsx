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

        if (value) params.set('search', value);
        else params.delete('search');

        if (pathname !== '/documents') {
            router.push(`/documents${params.toString() ? `?${params.toString()}` : ''}`);
            return;
        }

        router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
    }

    const initials =
        `${user.postNames?.[0] ?? ''}${user.surName?.[0] ?? ''}`.toUpperCase() ||
        'U';
    const status = searchParams.get('status');

    return (
        <header
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 30,
                padding: '18px clamp(18px, 3.4vw, 38px) 0',
                background:
                    'linear-gradient(180deg, rgba(236,233,255,0.94) 0%, rgba(236,233,255,0.78) 72%, rgba(236,233,255,0) 100%)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
            }}
        >
            <div
                className="glass-strong animate-fade-up"
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 28,
                    padding: '18px 20px 16px',
                    display: 'grid',
                    gap: 16,
                }}
            >
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        inset: '-32px auto auto -24px',
                        width: 220,
                        height: 220,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(91,35,255,0.16) 0%, rgba(91,35,255,0) 72%)',
                        pointerEvents: 'none',
                    }}
                />
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        inset: 'auto -40px -80px auto',
                        width: 280,
                        height: 180,
                        borderRadius: '50%',
                        background:
                            'radial-gradient(circle, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0) 74%)',
                        pointerEvents: 'none',
                    }}
                />

                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 18,
                        flexWrap: 'wrap',
                    }}
                >
                    <Link
                        href="/documents"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            textDecoration: 'none',
                            minWidth: 0,
                        }}
                    >
                        <div
                            style={{
                                width: 46,
                                height: 46,
                                borderRadius: 16,
                                background:
                                    'linear-gradient(135deg, var(--color-primary) 0%, #7352ff 100%)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 18,
                                fontWeight: 800,
                                boxShadow: '0 12px 28px rgba(91,35,255,0.22)',
                                flexShrink: 0,
                            }}
                        >
                            G
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 11,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.18em',
                                    color: 'var(--color-text-muted)',
                                    fontWeight: 700,
                                }}
                            >
                                Gracon 360
                            </p>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <h1
                                    style={{
                                        margin: 0,
                                        fontSize: 'clamp(1.1rem, 1rem + 0.6vw, 1.55rem)',
                                        lineHeight: 1,
                                        letterSpacing: '-0.04em',
                                        color: 'var(--color-text-primary)',
                                        fontWeight: 800,
                                    }}
                                >
                                    Documents
                                </h1>
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '5px 10px',
                                        borderRadius: 999,
                                        background: 'rgba(255,255,255,0.8)',
                                        border: '1px solid rgba(91,35,255,0.14)',
                                        color: 'var(--color-text-secondary)',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: '50%',
                                            background: 'var(--color-success)',
                                            boxShadow:
                                                '0 0 0 4px rgba(5,150,105,0.12)',
                                        }}
                                    />
                                    Workspace ready
                                </span>
                            </div>
                        </div>
                    </Link>

                    <form
                        onSubmit={submitSearch}
                        style={{
                            flex: '1 1 360px',
                            maxWidth: 620,
                            minWidth: 260,
                        }}
                    >
                        <div
                            style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <span
                                aria-hidden
                                style={{
                                    position: 'absolute',
                                    left: 16,
                                    fontSize: 13,
                                    color: 'var(--color-text-muted)',
                                    pointerEvents: 'none',
                                }}
                            >
                                ⌕
                            </span>
                            <input
                                type="search"
                                placeholder="Search titles, tags, or signed files"
                                className="input-glass"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                style={{
                                    height: 48,
                                    paddingLeft: 42,
                                    paddingRight: 14,
                                    borderRadius: 999,
                                    fontSize: 13,
                                    background: 'rgba(255,255,255,0.88)',
                                }}
                            />
                        </div>
                    </form>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                            justifyContent: 'flex-end',
                        }}
                    >
                        <Link
                            href="/documents/new?type=RICH_TEXT"
                            className="btn-primary"
                            style={{ textDecoration: 'none', padding: '11px 18px' }}
                        >
                            New document
                        </Link>
                        <Link
                            href="/verify"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost"
                            style={{
                                textDecoration: 'none',
                                padding: '10px 16px',
                                background: 'rgba(255,255,255,0.72)',
                            }}
                        >
                            Verify
                        </Link>
                    </div>
                </div>

                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 14,
                        flexWrap: 'wrap',
                    }}
                >
                    <nav
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                        }}
                    >
                        {NAV_ITEMS.map((item) => {
                            const active = item.isActive(pathname, status);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    title={item.description}
                                    style={{
                                        textDecoration: 'none',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '10px 14px',
                                        borderRadius: 14,
                                        border: `1px solid ${
                                            active
                                                ? 'rgba(91,35,255,0.22)'
                                                : 'rgba(91,35,255,0.08)'
                                        }`,
                                        background: active
                                            ? 'linear-gradient(180deg, rgba(91,35,255,0.14) 0%, rgba(91,35,255,0.08) 100%)'
                                            : 'rgba(255,255,255,0.6)',
                                        color: active
                                            ? 'var(--color-primary)'
                                            : 'var(--color-text-secondary)',
                                        fontSize: 13,
                                        fontWeight: active ? 700 : 600,
                                        boxShadow: active
                                            ? '0 8px 18px rgba(91,35,255,0.10)'
                                            : 'none',
                                        transition:
                                            'transform 150ms ease, box-shadow 150ms ease, background 150ms ease',
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: '50%',
                                            background: active
                                                ? 'var(--color-primary)'
                                                : 'rgba(91,35,255,0.18)',
                                        }}
                                    />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                            justifyContent: 'flex-end',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '8px 10px 8px 8px',
                                borderRadius: 18,
                                background: 'rgba(255,255,255,0.72)',
                                border: '1px solid rgba(91,35,255,0.10)',
                                minWidth: 0,
                            }}
                        >
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 14,
                                    background:
                                        'linear-gradient(135deg, rgba(91,35,255,0.14) 0%, rgba(59,130,246,0.14) 100%)',
                                    border: '1px solid rgba(91,35,255,0.12)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--color-primary)',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    flexShrink: 0,
                                }}
                            >
                                {initials}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: 'var(--color-text-primary)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: 180,
                                    }}
                                >
                                    {`${user.postNames} ${user.surName}`.trim()}
                                </p>
                                <p
                                    style={{
                                        margin: '1px 0 0',
                                        fontSize: 11,
                                        color: 'var(--color-text-muted)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: 180,
                                    }}
                                >
                                    {user.email}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={logout}
                            className="btn-ghost"
                            style={{ padding: '10px 16px', fontSize: 12 }}
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
