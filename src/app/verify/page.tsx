'use client';

import { useState } from 'react';
import { apiClient } from '@/api/client';

export default function VerifyPage() {
    const [documentId, setDocumentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        verified: boolean;
        title?: string;
        contentHash?: string;
        signedBy?: { name: string };
        signedAt?: string;
        lockedAt?: string;
        message?: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleVerify(e: React.FormEvent) {
        e.preventDefault();
        if (!documentId.trim()) return;
        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const res = await apiClient.get(`/documents/${documentId.trim()}/verify`);
            setResult(res.data);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Verification failed. Check the document ID and try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>G</div>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>Gracon 360</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>Document Verification</p>
            </div>

            {/* Form */}
            <div className="glass-strong animate-scale-in" style={{ width: '100%', maxWidth: 520, borderRadius: 'var(--radius-xl)', padding: 36 }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
                    <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>Verify a Document</h2>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>Enter the document ID to verify its authenticity. No account required.</p>
                </div>

                <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Document ID</label>
                        <input value={documentId} onChange={e => setDocumentId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="input-glass" style={{ fontFamily: 'monospace', fontSize: 13 }} required />
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'btn-spin 0.7s linear infinite' }} />
                                Verifying…
                            </span>
                        ) : 'Verify Document'}
                    </button>
                </form>

                {error && (
                    <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-error-subtle)', border: '1px solid var(--color-error-border)', fontSize: 13, color: 'var(--color-error)' }}>
                        {error}
                    </div>
                )}

                {result && (
                    <div style={{ marginTop: 20, padding: 20, borderRadius: 'var(--radius-lg)', background: result.verified ? 'var(--color-success-subtle)' : 'rgba(217,119,6,0.08)', border: `1px solid ${result.verified ? 'var(--color-success-border)' : 'rgba(217,119,6,0.28)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: result.verified ? 16 : 0 }}>
                            <span style={{ fontSize: 28 }}>{result.verified ? '✅' : '⚠️'}</span>
                            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: result.verified ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                {result.verified ? 'Document is Authentic' : result.message ?? 'Document not yet signed'}
                            </p>
                        </div>

                        {result.verified && (
                            <div>
                                {[
                                    { label: 'Title', value: result.title },
                                    { label: 'Signed by', value: result.signedBy?.name },
                                    { label: 'Signed at', value: result.signedAt ? new Date(result.signedAt).toLocaleString() : undefined },
                                    { label: 'Locked at', value: result.lockedAt ? new Date(result.lockedAt).toLocaleString() : undefined },
                                ].filter(r => r.value).map(({ label, value }) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(5,150,105,0.15)', fontSize: 13 }}>
                                        <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                                        <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{value}</span>
                                    </div>
                                ))}

                                {result.contentHash && (
                                    <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 8, background: 'rgba(5,150,105,0.08)', fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>
                                        Hash: {result.contentHash}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <p style={{ marginTop: 24, fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
                Verification is mathematical — it proves the document has not been modified since signing.
            </p>
        </div>
    );
}