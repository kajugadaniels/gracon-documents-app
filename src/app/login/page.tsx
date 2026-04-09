import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/pages/auth/login';

export const metadata: Metadata = {
    title: 'Sign In — Gracon 360 Documents',
    description: 'Sign in to access your documents workspace.',
};

export default function LoginPage() {
    return (
        <div
            style={{
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 24px',
            }}
        >
            <div style={{ width: '100%', maxWidth: 400 }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
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
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: 'var(--color-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: 16,
                            }}
                        >
                            G
                        </div>
                        <span
                            style={{
                                fontSize: 18,
                                fontWeight: 700,
                                color: 'var(--color-text-primary)',
                            }}
                        >
                            Gracon 360
                        </span>
                    </div>
                    <p
                        style={{
                            margin: 0,
                            fontSize: 13,
                            color: 'var(--color-text-muted)',
                        }}
                    >
                        Documents Workspace
                    </p>
                </div>

                <Suspense>
                    <LoginForm />
                </Suspense>
            </div>
        </div>
    );
}
