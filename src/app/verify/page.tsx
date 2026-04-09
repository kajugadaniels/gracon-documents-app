import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyForm } from '@/components/pages/verify';

export const metadata: Metadata = {
    title: 'Verify Document — Gracon 360',
    description: 'Verify the authenticity of a digitally signed document.',
};

export default function VerifyPage() {
    return (
        <div
            style={{
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 24px',
            }}
        >
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: 'var(--color-primary-subtle)',
                            border: '1px solid var(--color-border-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            color: 'var(--color-text-primary)',
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
                    Digital Trust Infrastructure Platform
                </p>
            </div>

            <Suspense fallback={null}>
                <VerifyForm />
            </Suspense>

            <p
                style={{
                    marginTop: 32,
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    textAlign: 'center',
                    maxWidth: 400,
                    lineHeight: 1.6,
                }}
            >
                This verification is performed mathematically — no trust in any
                person or institution is required. The result is either valid or
                it is not.
            </p>
        </div>
    );
}
