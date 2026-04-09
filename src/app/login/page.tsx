import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/pages/auth/login';

export const metadata: Metadata = {
    title: 'Sign In — Gracon Documents',
    description: 'Sign in to your verified account',
};

export default function LoginPage() {
    return (
        <main
            style={{
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 16px',
            }}
        >
            <Suspense>
                <LoginForm />
            </Suspense>
        </main>
    );
}
