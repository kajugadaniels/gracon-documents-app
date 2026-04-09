'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Card } from '@/components/ui';
import { loginApi } from '@/api/auth/login.api';
import { useAuthStore } from '@/lib/store/auth.store';

const MAIN_APP_URL =
    process.env.NEXT_PUBLIC_MAIN_APP_URL ?? 'http://localhost:4000';

interface LoginErrors {
    email?: string;
    password?: string;
}

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setTokens, setUser } = useAuthStore();

    const nextPath = searchParams.get('next') ?? '/documents';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<LoginErrors>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function validate(): boolean {
        const nextErrors: LoginErrors = {};
        const normalizedEmail = email.toLowerCase().trim();

        if (!normalizedEmail) {
            nextErrors.email = 'Please enter a valid email address';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            nextErrors.email = 'Please enter a valid email address';
        }

        if (!password) {
            nextErrors.password = 'Password is required';
        } else if (password.length > 128) {
            nextErrors.password = 'Password is too long';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setApiError(null);

        if (!validate()) {
            return;
        }

        setLoading(true);

        try {
            const response = await loginApi({
                email: email.toLowerCase().trim(),
                password,
            });
            const { accessToken, refreshToken, user } = response.data.data;

            if (response.data.tokenType === 'limited') {
                window.location.href = `${MAIN_APP_URL}/verify-identity`;
                return;
            }

            setTokens(accessToken, refreshToken);
            setUser(user);

            document.cookie =
                `doc_session=1; path=/; SameSite=Strict; max-age=${60 * 60 * 24 * 30}`;

            router.push(nextPath);
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ??
                'Login failed. Please check your credentials.';

            setApiError(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card strength="strong" style={{ width: '100%', maxWidth: 400 }}>
            <div className="animate-fade-up" style={{ padding: '4px 0' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            fontWeight: 700,
                            color: '#fff',
                            margin: '0 auto 18px',
                            boxShadow: '0 4px 16px var(--color-primary-glow)',
                        }}
                    >
                        ID
                    </div>

                    <h1
                        style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                            marginBottom: 6,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Welcome back
                    </h1>
                    <p
                        style={{
                            fontSize: 14,
                            color: 'var(--color-text-secondary)',
                            margin: 0,
                        }}
                    >
                        Sign in to your verified account
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                    noValidate
                >
                    <Input
                        label="Email address"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => {
                            setEmail(event.target.value);
                            if (errors.email) {
                                setErrors((previous) => ({
                                    ...previous,
                                    email: undefined,
                                }));
                            }
                        }}
                        error={errors.email}
                    />

                    <Input
                        label="Password"
                        showPasswordToggle
                        placeholder="Your password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(event) => {
                            setPassword(event.target.value);
                            if (errors.password) {
                                setErrors((previous) => ({
                                    ...previous,
                                    password: undefined,
                                }));
                            }
                        }}
                        error={errors.password}
                    />

                    {apiError && (
                        <div
                            role="alert"
                            className="animate-scale-in"
                            style={{
                                background: 'var(--color-error-subtle)',
                                border: '1px solid var(--color-error-border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '10px 14px',
                                fontSize: 13,
                                color: 'var(--color-error)',
                            }}
                        >
                            {apiError}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <a
                            href={`${MAIN_APP_URL}/forgot-password`}
                            style={{
                                fontSize: 12,
                                color: 'var(--color-text-muted)',
                                textDecoration: 'none',
                                fontWeight: 500,
                            }}
                        >
                            Forgot password?
                        </a>
                    </div>

                    <Button
                        type="submit"
                        fullWidth
                        loading={loading}
                        loadingText="Signing in..."
                        style={{ marginTop: 4 }}
                    >
                        Sign in
                    </Button>
                </form>

                <p
                    style={{
                        textAlign: 'center',
                        fontSize: 13,
                        color: 'var(--color-text-muted)',
                        marginTop: 24,
                        marginBottom: 0,
                    }}
                >
                    Don&apos;t have an account?{' '}
                    <a
                        href={`${MAIN_APP_URL}/register`}
                        style={{
                            color: 'var(--color-primary)',
                            fontWeight: 500,
                            textDecoration: 'none',
                        }}
                    >
                        Create one
                    </a>
                </p>
            </div>
        </Card>
    );
}
