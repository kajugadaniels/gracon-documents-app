'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authClient } from '@/api/client';
import { useAuthStore } from '@/lib/store/auth.store';

export default function LoginPage() {
    const router = useRouter();
    const { setTokens, setUser } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        if (!email || !password) { toast.error('Please fill in all fields.'); return; }

        setLoading(true);
        try {
            const res = await authClient.post('/auth/login', { email, password });
            const data = res.data?.data ?? res.data;

            setTokens(data.accessToken, data.refreshToken);
            setUser(data.user);

            // Set session cookie for middleware
            document.cookie = `doc_session=1; path=/; max-age=${60 * 60 * 24 * 30}`;

            toast.success('Welcome back!');
            router.replace('/documents');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ?? 'Login failed. Please check your credentials.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 16px',
            }}
        >
            <div
                className="glass-strong animate-scale-in"
                style={{
                    width: '100%',
                    maxWidth: 440,
                    borderRadius: 'var(--radius-xl)',
                    padding: '48px 40px',
                }}
            >
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 10,
                            marginBottom: 8,
                        }}
                    >
                        <div
                            style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: 'var(--color-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 800, fontSize: 16,
                            }}
                        >
                            G
                        </div>
                        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            Gracon 360
                        </span>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
                        Sign in to access your documents
                    </p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="input-glass"
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="input-glass"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{ width: '100%', marginTop: 8 }}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'btn-spin 0.7s linear infinite' }} />
                                Signing in…
                            </span>
                        ) : 'Sign In'}
                    </button>
                </form>

                <p style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Use your Gracon 360 account credentials
                </p>
            </div>
        </div>
    );
}