'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    verifyDocument,
    type VerifyDocumentResponse,
} from '@/api/documents.api';
import { PremiumLoader } from '@/components/ui';
import { VerifySignerChain } from './VerifySignerChain';

const DOCUMENT_ID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDateTime(value: string | undefined) {
    return value ? new Date(value).toLocaleString() : undefined;
}

function getPrimarySignerLabel(result: VerifyDocumentResponse) {
    return (result.signers?.length ?? 0) > 1 ? 'Primary seal by' : 'Signed by';
}

export function VerifyForm() {
    const searchParams = useSearchParams();
    const [documentId, setDocumentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<VerifyDocumentResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const lastAutoVerifiedIdRef = useRef<string | null>(null);

    async function runVerification(targetId: string) {
        setError(null);
        setResult(null);

        if (!DOCUMENT_ID_PATTERN.test(targetId)) {
            setError('Document ID must be a valid UUID.');
            return;
        }

        setLoading(true);

        try {
            const response = await verifyDocument(targetId);
            setResult(response);
        } catch (issue: unknown) {
            const message =
                (issue as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ??
                (issue instanceof Error
                    ? issue.message
                    : 'Verification request failed');
            setError(message);
        } finally {
            setLoading(false);
        }
    }

    async function handleVerify() {
        const trimmedId = documentId.trim();
        await runVerification(trimmedId);
    }

    useEffect(() => {
        const presetId = searchParams.get('documentId')?.trim() ?? '';

        if (!presetId || !DOCUMENT_ID_PATTERN.test(presetId)) {
            return;
        }

        if (lastAutoVerifiedIdRef.current === presetId) {
            return;
        }

        lastAutoVerifiedIdRef.current = presetId;
        setDocumentId(presetId);
        void runVerification(presetId);
    }, [searchParams]);

    function reset() {
        setDocumentId('');
        setResult(null);
        setError(null);
        lastAutoVerifiedIdRef.current = null;
    }

    return (
        <div
            style={{
                background: 'rgba(255, 255, 255, 0.82)',
                backdropFilter: 'blur(32px)',
                border: '1px solid rgba(255, 255, 255, 0.96)',
                borderRadius: 'var(--radius-xl)',
                boxShadow:
                    '0 8px 40px rgba(91, 35, 255, 0.10), 0 2px 8px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 1)',
                padding: 36,
                width: '100%',
                maxWidth: 560,
            }}
        >
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                <h2
                    style={{
                        margin: '0 0 8px',
                        fontSize: 22,
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                    }}
                >
                    Verify a Document
                </h2>
                <p
                    style={{
                        margin: 0,
                        fontSize: 14,
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.6,
                    }}
                >
                    Enter the document ID to confirm authenticity. No account
                    required.
                </p>
            </div>

            <div style={{ marginBottom: 16 }}>
                <label
                    htmlFor="document-id"
                    style={{
                        display: 'block',
                        fontSize: 12,
                        color: 'var(--color-text-muted)',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                    }}
                >
                    Document ID
                </label>
                <input
                    id="document-id"
                    value={documentId}
                    onChange={(event) => setDocumentId(event.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-bg-input)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        outline: 'none',
                    }}
                    onFocus={(event) => {
                        event.target.style.borderColor =
                            'var(--color-border-primary)';
                    }}
                    onBlur={(event) => {
                        event.target.style.borderColor = 'var(--color-border)';
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleVerify();
                        }
                    }}
                />
            </div>

            {error && (
                <div
                    style={{
                        background: 'var(--color-error-subtle)',
                        border: '1px solid var(--color-error-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        fontSize: 13,
                        color: 'var(--color-error)',
                        marginBottom: 16,
                    }}
                >
                    {error}
                </div>
            )}

            {result && (
                <div
                    style={{
                        background: result.verified
                            ? 'var(--color-success-subtle)'
                            : 'var(--color-error-subtle)',
                        border: `1px solid ${
                            result.verified
                                ? 'var(--color-success-border)'
                                : 'var(--color-error-border)'
                        }`,
                        borderRadius: 'var(--radius-lg)',
                        padding: 20,
                        marginBottom: 20,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            marginBottom: result.verified ? 16 : 0,
                        }}
                    >
                        <span style={{ fontSize: 28 }}>
                            {result.verified ? '✅' : '❌'}
                        </span>
                        <div>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: result.verified
                                        ? 'var(--color-success)'
                                        : 'var(--color-error)',
                                }}
                            >
                                {result.verified
                                    ? result.title
                                        ? `Document "${result.title}" is authentic`
                                        : 'Document is authentic'
                                    : 'Document could not be verified'}
                            </p>
                            {!result.verified && result.message && (
                                <p
                                    style={{
                                        margin: '4px 0 0',
                                        fontSize: 13,
                                        color: 'var(--color-error)',
                                        opacity: 0.8,
                                    }}
                                >
                                    {result.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {result.verified && (
                        <div
                            style={{
                                borderTop:
                                    '1px solid var(--color-success-border)',
                                paddingTop: 16,
                            }}
                        >
                            {[
                                { label: 'Title', value: result.title },
                                {
                                    label: 'Verified signers',
                                    value: result.signers?.length
                                        ? `${result.signers.length}`
                                        : undefined,
                                },
                                {
                                    label: getPrimarySignerLabel(result),
                                    value: result.signedBy?.name,
                                },
                                {
                                    label: 'Signed at',
                                    value: formatDateTime(result.signedAt),
                                },
                                {
                                    label: 'Locked at',
                                    value: formatDateTime(result.lockedAt),
                                },
                            ]
                                .filter(
                                    (
                                        row,
                                    ): row is { label: string; value: string } =>
                                        typeof row.value === 'string' &&
                                        row.value.length > 0,
                                )
                                .map(({ label, value }) => (
                                    <div
                                        key={label}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '6px 0',
                                            borderBottom:
                                                '1px solid rgba(52,211,153,0.15)',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 12,
                                                color: 'var(--color-text-muted)',
                                            }}
                                        >
                                            {label}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                                color: 'var(--color-success)',
                                                textAlign: 'right',
                                            }}
                                        >
                                            {value}
                                        </span>
                                    </div>
                                ))}

                            {result.contentHash && (
                                <div
                                    style={{
                                        marginTop: 12,
                                        padding: '10px 12px',
                                        background: 'rgba(52,211,153,0.08)',
                                        borderRadius: 8,
                                    }}
                                >
                                    <p
                                        style={{
                                            margin: '0 0 4px',
                                            fontSize: 11,
                                            color: 'var(--color-text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                        }}
                                    >
                                        Content hash
                                    </p>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: 12,
                                            color: 'var(--color-success)',
                                            lineHeight: 1.5,
                                            fontFamily: 'monospace',
                                            wordBreak: 'break-all',
                                        }}
                                    >
                                        {result.contentHash}
                                    </p>
                                </div>
                            )}

                            {result.signers && result.signers.length > 0 && (
                                <VerifySignerChain signers={result.signers} />
                            )}
                        </div>
                    )}
                </div>
            )}

            {result ? (
                <button
                    onClick={reset}
                    style={{
                        width: '100%',
                        background: 'var(--color-bg-input)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '11px 0',
                        fontSize: 14,
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                    }}
                >
                    Verify Another Document
                </button>
            ) : (
                <button
                    onClick={() => {
                        void handleVerify();
                    }}
                    disabled={loading}
                    className="btn-primary"
                    style={{ width: '100%' }}
                >
                    {loading ? (
                        <span
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                justifyContent: 'center',
                            }}
                        >
                            <PremiumLoader size={15} color="white" />
                            Verifying…
                        </span>
                    ) : (
                        'Verify Document'
                    )}
                </button>
            )}
        </div>
    );
}
