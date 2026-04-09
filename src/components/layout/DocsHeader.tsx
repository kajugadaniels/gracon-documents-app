'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SessionUser } from '@/app/(protected)/layout';
import { APP_URL } from '@/lib/session';

export function DocsHeader({ user }: { user: SessionUser }) {
    const router = useRouter();

    function logout() {
        document.cookie = 'g360_at=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'g360_rt=; path=/; max-age=0; SameSite=Lax';
        window.location.href = `${APP_URL}/logout`;
    }

    return (
        <header style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            flexShrink: 0,
            gap: 16,
        }}>
            {/* Search */}
            <div style={{ flex: 1, maxWidth: 400 }}>
                <input
                    type="search"
                    placeholder="Search documents…"
                    className="input-glass"
                    style={{ height: 36, fontSize: 13, padding: '0 12px' }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            const q = (e.target as HTMLInputElement).value.trim();
                            if (q) router.push(`/documents?search=${encodeURIComponent(q)}`);
                        }
                    }}
                />
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <Link href="/verify" target="_blank"
                    style={{ fontSize: 12, color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>🔍</span> Verify
                </Link>

                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {`${user.postNames} ${user.surName}`.trim()}
                </span>

                <button onClick={logout} className="btn-ghost" style={{ padding: '6px 16px', fontSize: 12 }}>
                    Sign out
                </button>
            </div>
        </header>
    );
}
