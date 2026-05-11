import { createElement, useEffect, useMemo, useState } from 'react';
import { mergeAttributes, Node } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';

interface SignatureBlockAttrs {
    blockId?: string;
    label?: string;
    signerRole?: string;
    required?: boolean;
    signerUserId?: string;
    signerAccessId?: string;
    signerName?: string;
    signerEmail?: string;
    signatureId?: string;
    signedAt?: string;
    signatureImageUrl?: string | null;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        signatureBlock: {
            insertSignatureBlocks: (blocks: SignatureBlockAttrs[]) => ReturnType;
            syncAssignedSignatureBlocks: (blocks: SignatureBlockAttrs[]) => ReturnType;
            updateSignatureBlockEvidence: (blocks: SignatureBlockAttrs[]) => ReturnType;
        };
    }
}

function getStringAttr(value: unknown, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}

function getSignatureBlockKey(attrs: Record<string, unknown>) {
    const signerUserId = getStringAttr(attrs.signerUserId);
    const signerAccessId = getStringAttr(attrs.signerAccessId);
    const blockId = getStringAttr(attrs.blockId);

    if (signerUserId) return `user:${signerUserId}`;
    if (signerAccessId) return `access:${signerAccessId}`;
    if (blockId) return `block:${blockId}`;
    return '';
}

function getBooleanAttr(value: unknown, fallback = true) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value !== 'false';
    return fallback;
}

function isDirectImageUrl(value: string | null): value is string {
    return Boolean(value && /^(https?:|data:|blob:|\/)/i.test(value));
}

function formatSignedDate(signedAt: string) {
    return new Date(signedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

async function getCurrentSignatureImageUrl() {
    const response = await fetch('/api/v1/signature/image', { credentials: 'include' });
    if (!response.ok) return null;

    const payload = await response.json().catch(() => null);
    return typeof payload?.url === 'string' ? payload.url : null;
}

function SignatureMark({
    imageUrl,
    signerUserId,
    signerName,
    signed,
}: {
    imageUrl: string | null;
    signerUserId: string | null;
    signerName: string;
    signed: boolean;
}) {
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentSignatureUrl, setCurrentSignatureUrl] = useState<string | null>(null);
    const [cleanSignatureUrl, setCleanSignatureUrl] = useState<string | null>(null);
    const [shouldUseCurrentSignature, setShouldUseCurrentSignature] = useState(false);
    const normalizedImageUrl = imageUrl?.trim() || null;
    const isCurrentSigner = Boolean(signerUserId && currentUserId === signerUserId);
    const shouldResolveCurrentSignature =
        signed &&
        isCurrentSigner &&
        (!isDirectImageUrl(normalizedImageUrl) || shouldUseCurrentSignature);
    const displayImageUrl = useMemo(() => {
        if (shouldResolveCurrentSignature && currentSignatureUrl) {
            return currentSignatureUrl;
        }

        return isDirectImageUrl(normalizedImageUrl) ? normalizedImageUrl : null;
    }, [currentSignatureUrl, normalizedImageUrl, shouldResolveCurrentSignature]);

    useEffect(() => {
        let cancelled = false;

        if (!signed || !signerUserId || currentUserId) return undefined;

        void fetch('/api/me', { credentials: 'include' })
            .then((response) => (response.ok ? response.json() : null))
            .then((payload) => {
                if (!cancelled) {
                    setCurrentUserId(
                        typeof payload?.userId === 'string'
                            ? payload.userId
                            : typeof payload?.id === 'string'
                                ? payload.id
                                : null,
                    );
                }
            })
            .catch(() => {
                if (!cancelled) setCurrentUserId(null);
            });

        return () => {
            cancelled = true;
        };
    }, [currentUserId, signed, signerUserId]);

    useEffect(() => {
        let cancelled = false;

        if (!shouldResolveCurrentSignature) return undefined;

        void getCurrentSignatureImageUrl().then((imageUrl) => {
            if (!cancelled) {
                setCurrentSignatureUrl(imageUrl);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [shouldResolveCurrentSignature]);

    useEffect(() => {
        let cancelled = false;

        setCleanSignatureUrl(null);
        if (!displayImageUrl) return undefined;

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            if (cancelled) return;

            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) return;

            try {
                context.drawImage(image, 0, 0);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const { data } = imageData;

                for (let index = 0; index < data.length; index += 4) {
                    const red = data[index];
                    const green = data[index + 1];
                    const blue = data[index + 2];
                    const max = Math.max(red, green, blue);
                    const min = Math.min(red, green, blue);
                    const isNearWhite = red > 220 && green > 220 && blue > 220;
                    const isLightNeutral = red > 175 && green > 175 && blue > 175 && max - min < 34;

                    if (isNearWhite || isLightNeutral) {
                        data[index + 3] = 0;
                    }
                }

                context.putImageData(imageData, 0, 0);
                setCleanSignatureUrl(canvas.toDataURL('image/png'));
            } catch {
                setCleanSignatureUrl(null);
            }
        };
        image.src = displayImageUrl;

        return () => {
            cancelled = true;
        };
    }, [displayImageUrl]);

    if (displayImageUrl) {
        return createElement('img', {
            src: cleanSignatureUrl ?? displayImageUrl,
            alt: `${signerName} signature`,
            className: 'document-signature-block__image',
            draggable: false,
            onError: () => {
                if (isCurrentSigner) {
                    setShouldUseCurrentSignature(true);
                }
            },
        });
    }

    if (!signed) return null;

    return createElement(
        'span',
        { className: 'document-signature-block__signed-text' },
        'Digitally signed',
    );
}

function SignatureBlockNodeView({ node }: NodeViewProps) {
    const signerName = getStringAttr(node.attrs.signerName)
        || getStringAttr(node.attrs.label, 'Signature');
    const signerEmail = getStringAttr(node.attrs.signerEmail);
    const signerUserId = getStringAttr(node.attrs.signerUserId) || null;
    const signatureImageUrl = getStringAttr(node.attrs.signatureImageUrl) || null;
    const signedAt = getStringAttr(node.attrs.signedAt);
    const signatureId = getStringAttr(node.attrs.signatureId);
    const signed = Boolean(signatureId || signedAt);
    const signedDate = signedAt ? formatSignedDate(signedAt) : null;

    return createElement(
        NodeViewWrapper,
        {
            as: 'section',
            'data-type': 'signature-block',
            'aria-label': `${getStringAttr(node.attrs.label, signerName)} signature block`,
            className: `document-signature-block${signed ? ' document-signature-block--signed' : ''}`,
        },
        createElement(
            'div',
            { className: 'document-signature-block__signature-area' },
            createElement(SignatureMark, {
                imageUrl: signatureImageUrl,
                signerUserId,
                signerName,
                signed,
            }),
            createElement('span', { className: 'document-signature-block__line' }),
        ),
        createElement(
            'div',
            { className: 'document-signature-block__meta' },
            createElement('strong', null, signerName),
            signerEmail ? createElement('span', null, signerEmail) : null,
            signedDate
                ? createElement('span', { className: 'document-signature-block__date' }, `Signed ${signedDate}`)
                : null,
        ),
    );
}

function renderSignatureBlock(HTMLAttributes: Record<string, unknown>): DOMOutputSpec {
    const signerName = getStringAttr(HTMLAttributes.signerName)
        || getStringAttr(HTMLAttributes.label, 'Signature');
    const signerEmail = getStringAttr(HTMLAttributes.signerEmail);
    const signatureImageUrl = getStringAttr(HTMLAttributes.signatureImageUrl);
    const signedAt = getStringAttr(HTMLAttributes.signedAt);
    const signatureId = getStringAttr(HTMLAttributes.signatureId);
    const signed = Boolean(signatureId || signedAt);
    const signedDate = signedAt
        ? new Date(signedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
        : null;

    return [
        'section',
        mergeAttributes(HTMLAttributes, {
            'data-type': 'signature-block',
            'aria-label': `${getStringAttr(HTMLAttributes.label, signerName)} signature block`,
            class: `document-signature-block${signed ? ' document-signature-block--signed' : ''}`,
        }),
        [
            'div',
            { class: 'document-signature-block__signature-area' },
            signatureImageUrl
                ? ['img', {
                    class: 'document-signature-block__image',
                    src: signatureImageUrl,
                    alt: `${signerName} signature`,
                    draggable: 'false',
                }]
                : signed
                    ? ['span', { class: 'document-signature-block__signed-text' }, 'Digitally signed']
                    : '',
            ['span', { class: 'document-signature-block__line' }],
        ],
        [
            'div',
            { class: 'document-signature-block__meta' },
            ['strong', {}, signerName],
            signerEmail
                ? ['span', {}, signerEmail]
                : '',
            signedDate
                ? ['span', { class: 'document-signature-block__date' }, `Signed ${signedDate}`]
                : '',
        ],
    ];
}

/**
 * Non-editable signer assignment block used inside the continuous TipTap editor.
 */
export const SignatureBlockExtension = Node.create({
    name: 'signatureBlock',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: false,

    addAttributes() {
        return {
            blockId: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-block-id'),
                renderHTML: (attributes) => attributes.blockId ? { 'data-block-id': attributes.blockId } : {},
            },
            label: { default: 'Signature' },
            signerRole: { default: 'Required signer' },
            required: {
                default: true,
                parseHTML: (element) => getBooleanAttr(element.getAttribute('data-required'), true),
                renderHTML: (attributes) => ({ 'data-required': String(attributes.required !== false) }),
            },
            signerUserId: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-signer-user-id'),
                renderHTML: (attributes) => attributes.signerUserId ? { 'data-signer-user-id': attributes.signerUserId } : {},
            },
            signerAccessId: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-signer-access-id'),
                renderHTML: (attributes) => attributes.signerAccessId ? { 'data-signer-access-id': attributes.signerAccessId } : {},
            },
            signerName: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-signer-name'),
                renderHTML: (attributes) => attributes.signerName ? { 'data-signer-name': attributes.signerName } : {},
            },
            signerEmail: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-signer-email'),
                renderHTML: (attributes) => attributes.signerEmail ? { 'data-signer-email': attributes.signerEmail } : {},
            },
            signatureId: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-signature-id'),
                renderHTML: (attributes) => attributes.signatureId ? { 'data-signature-id': attributes.signatureId } : {},
            },
            signedAt: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-signed-at'),
                renderHTML: (attributes) => attributes.signedAt ? { 'data-signed-at': attributes.signedAt } : {},
            },
            signatureImageUrl: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-signature-image-url'),
                renderHTML: (attributes) => attributes.signatureImageUrl ? { 'data-signature-image-url': attributes.signatureImageUrl } : {},
            },
        };
    },

    parseHTML() {
        return [{ tag: '[data-type="signature-block"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return renderSignatureBlock(HTMLAttributes);
    },

    addCommands() {
        return {
            insertSignatureBlocks: (blocks) => ({ state, dispatch }) => {
                if (blocks.length === 0) return false;

                const signatureType = state.schema.nodes.signatureBlock;
                if (!signatureType) return false;

                const tr = state.tr;
                const positions: Array<{ pos: number; size: number }> = [];
                state.doc.descendants((node, pos) => {
                    if (node.type.name === 'signatureBlock') {
                        positions.push({ pos, size: node.nodeSize });
                    }
                });

                positions.reverse().forEach(({ pos, size }) => {
                    tr.delete(pos, pos + size);
                });

                const insertPos = Math.min(tr.selection.from, tr.doc.content.size);
                const nodes = blocks.map((block) => signatureType.create(block));
                tr.insert(insertPos, nodes);

                dispatch?.(tr.scrollIntoView());
                return true;
            },
            syncAssignedSignatureBlocks: (blocks) => ({ state, dispatch }) => {
                if (blocks.length === 0) return false;

                const signatureType = state.schema.nodes.signatureBlock;
                if (!signatureType) return false;

                const tr = state.tr;
                const existingPositions: Array<{ pos: number; size: number }> = [];

                state.doc.descendants((node, pos) => {
                    if (node.type.name !== 'signatureBlock') return;

                    existingPositions.push({ pos, size: node.nodeSize });
                });

                const insertAnchor = existingPositions[0]?.pos ?? state.selection.from;
                existingPositions.reverse().forEach(({ pos, size }) => {
                    tr.delete(pos, pos + size);
                });

                const insertPos = Math.min(
                    tr.mapping.map(insertAnchor, -1),
                    tr.doc.content.size,
                );
                tr.insert(insertPos, blocks.map((block) => signatureType.create(block)));

                dispatch?.(tr.scrollIntoView());
                return true;
            },
            updateSignatureBlockEvidence: (blocks) => ({ state, dispatch }) => {
                if (blocks.length === 0) return false;

                const evidenceByKey = new Map(
                    blocks.flatMap((block) => {
                        const entries: Array<[string, SignatureBlockAttrs]> = [];
                        const signerUserId = getStringAttr(block.signerUserId);
                        const signerAccessId = getStringAttr(block.signerAccessId);
                        const blockId = getStringAttr(block.blockId);

                        if (signerUserId) entries.push([`user:${signerUserId}`, block]);
                        if (signerAccessId) entries.push([`access:${signerAccessId}`, block]);
                        if (blockId) entries.push([`block:${blockId}`, block]);

                        return entries;
                    }),
                );
                if (evidenceByKey.size === 0) return false;

                const tr = state.tr;
                let changed = false;

                state.doc.descendants((node, pos) => {
                    if (node.type.name !== 'signatureBlock') return;

                    const evidence = evidenceByKey.get(getSignatureBlockKey(node.attrs))
                        ?? evidenceByKey.get(`access:${getStringAttr(node.attrs.signerAccessId)}`)
                        ?? evidenceByKey.get(`block:${getStringAttr(node.attrs.blockId)}`);
                    if (!evidence) return;

                    const nextAttrs = {
                        ...node.attrs,
                        label: evidence.label ?? node.attrs.label,
                        signerRole: evidence.signerRole ?? node.attrs.signerRole,
                        signerAccessId: evidence.signerAccessId ?? node.attrs.signerAccessId,
                        signerName: evidence.signerName ?? node.attrs.signerName,
                        signerEmail: evidence.signerEmail ?? node.attrs.signerEmail,
                        signatureId: evidence.signatureId ?? null,
                        signedAt: evidence.signedAt ?? null,
                        signatureImageUrl: evidence.signatureImageUrl ?? null,
                    };
                    const attrsChanged = Object.entries(nextAttrs).some(
                        ([key, value]) => node.attrs[key] !== value,
                    );

                    if (!attrsChanged) return;

                    changed = true;
                    tr.setNodeMarkup(pos, undefined, nextAttrs);
                });

                if (!changed) return true;

                dispatch?.(tr);
                return true;
            },
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(SignatureBlockNodeView);
    },
});
