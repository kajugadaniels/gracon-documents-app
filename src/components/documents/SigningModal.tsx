/**
 * Modal that signs a finalised document hash and records the user's signature.
 *
 * The signing submit uses a local BFF route so the browser does not coordinate
 * separate signature-service and document-service calls.
 */
'use client';

import { useState } from 'react';
import { toast } from '@/components/ui';
import { signDocumentInOneStep, type DocumentDetail } from '@/api/documents.api';

interface SigningModalProps {
    document: DocumentDetail;
    onClose: () => void;
    onSigned: (updated: Partial<DocumentDetail>) => void;
}

type Step = 'review' | 'signing' | 'done';

export function SigningModal({ document: doc, onClose, onSigned }: SigningModalProps) {
    const [step, setStep] = useState<Step>('review');
    const [signatureBytes, setSignatureBytes] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    async function handleSign() {
        if (!doc.contentHash) { toast.error('Document has no content hash. Finalise it first.'); return; }

        setStep('signing');
        setLoading(true);
        try {
            const signed = await signDocumentInOneStep(doc.id, doc.contentHash, doc.title);
            setSignatureBytes(signed.signatureBytes ?? '');
            onSigned(signed);
            setStep('done');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Signing failed. Ensure your certificate is active in the Profile app.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    function copyHash() {
        if (doc.contentHash) { navigator.clipboard.writeText(doc.contentHash); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(22,16,58,0.60)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={e => { if (e.target === e.currentTarget && step !== 'signing') onClose(); }}
        >
            <div className="glass-strong animate-scale-in" style={{ width: '100%', maxWidth: 500, borderRadius: 'var(--radius-xl)', padding: 36 }}>

                {step === 'review' && (
                    <>
                        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {doc.status === 'FINALISED' ? 'Sign Document' : '✅ Document Already Locked'}
                        </h2>
                        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                            {doc.status === 'FINALISED'
                                ? 'By signing, you confirm this document is accurate and complete. Your signature will be recorded against the frozen document.'
                                : 'This document has already been signed and locked.'}
                        </p>

                        {/* Document hash */}
                        <div style={{ marginBottom: 24 }}>
                            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Document SHA-256 Hash
                            </p>
                            <div style={{ position: 'relative' }}>
                                <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-secondary)', wordBreak: 'break-all', paddingRight: 70 }}>
                                    {doc.contentHash}
                                </div>
                                <button onClick={copyHash} style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', background: copied ? 'var(--color-success-subtle)' : 'rgba(91,35,255,0.08)', border: `1px solid ${copied ? 'var(--color-success-border)' : 'var(--color-border)'}`, borderRadius: 6, padding: '3px 10px', fontSize: 11, color: copied ? 'var(--color-success)' : 'var(--color-text-secondary)', cursor: 'pointer' }}>
                                    {copied ? '✓ Copied' : 'Copy'}
                                </button>
                            </div>
                            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>
                                This is the unique fingerprint of your document. Any change to the content would produce a completely different hash.
                            </p>
                        </div>

                        {doc.status === 'FINALISED' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                                <button onClick={() => { void handleSign(); }} className="btn-primary" style={{ flex: 2 }} disabled={loading}>
                                    Sign with My Certificate
                                </button>
                            </div>
                        )}

                        {doc.status === 'LOCKED' && (
                            <button onClick={onClose} className="btn-primary" style={{ width: '100%' }}>Close</button>
                        )}
                    </>
                )}

                {step === 'signing' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid rgba(91,35,255,0.2)', borderTopColor: 'var(--color-primary)', animation: 'btn-spin 0.7s linear infinite', margin: '0 auto 20px' }} />
                        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>Signing in progress…</p>
                        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>Your private key is being used to sign the document hash. Do not close this window.</p>
                    </div>
                )}

                {step === 'done' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
                            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>Signature Recorded</h2>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                Your document has been cryptographically signed. The owner can lock it once all required signatures are complete.
                            </p>
                        </div>

                        {signatureBytes && (
                            <div style={{ marginBottom: 20 }}>
                                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signature Bytes (base64)</p>
                                <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-success-subtle)', border: '1px solid var(--color-success-border)', fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-secondary)', wordBreak: 'break-all', maxHeight: 80, overflowY: 'auto' }}>
                                    {signatureBytes}
                                </div>
                            </div>
                        )}

                        <button onClick={onClose} className="btn-primary" style={{ width: '100%' }}>
                            Done
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
