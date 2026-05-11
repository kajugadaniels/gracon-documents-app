/**
 * Defines the non-editable signature block node used by the document editor.
 */
import { mergeAttributes, Node, type NodeViewRendererProps } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import type { NodeView } from '@tiptap/pm/view';

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

function getCanvasSafeSignatureImageUrl(value: string) {
    if (/^(data:|blob:|\/)/i.test(value)) {
        return value;
    }

    try {
        const url = new URL(value);
        const isS3PresignedUrl =
            url.protocol === 'https:' &&
            (url.hostname.endsWith('.amazonaws.com') || url.hostname.endsWith('.amazonaws.com.cn')) &&
            url.pathname.includes('/signature-images/') &&
            url.searchParams.has('X-Amz-Signature');

        if (isS3PresignedUrl) {
            return `/api/v1/signature/image/render?url=${encodeURIComponent(value)}`;
        }
    } catch {
        return value;
    }

    return value;
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

interface SignatureBlockDomState {
    abortController: AbortController | null;
    renderVersion: number;
}

function clearElement(element: HTMLElement) {
    element.replaceChildren();
}

function setOptionalDataAttribute(element: HTMLElement, name: string, value: unknown) {
    const stringValue = getStringAttr(value);

    if (stringValue) {
        element.setAttribute(name, stringValue);
    } else {
        element.removeAttribute(name);
    }
}

function createSignatureText() {
    const signedText = document.createElement('span');
    signedText.className = 'document-signature-block__signed-text';
    signedText.textContent = 'Digitally signed';
    return signedText;
}

function removeLightSignaturePixels(image: HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

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
    return canvas.toDataURL('image/png');
}

function createSignatureImage(
    imageUrl: string,
    signerName: string,
    renderVersion: number,
    state: SignatureBlockDomState,
) {
    const image = document.createElement('img');
    const displayImageUrl = getCanvasSafeSignatureImageUrl(imageUrl);

    image.className = 'document-signature-block__image';
    image.alt = `${signerName} signature`;
    image.draggable = false;
    image.crossOrigin = 'anonymous';
    image.src = displayImageUrl;
    image.addEventListener('load', () => {
        if (state.renderVersion !== renderVersion) return;

        try {
            const cleanImageUrl = removeLightSignaturePixels(image);
            if (cleanImageUrl) {
                image.removeAttribute('crossorigin');
                image.src = cleanImageUrl;
            }
        } catch {
            // A non-readable image is still a valid signature preview; keep the source visible.
        }
    }, { once: true });
    image.addEventListener('error', () => {
        if (state.renderVersion !== renderVersion || displayImageUrl === imageUrl) return;

        image.removeAttribute('crossorigin');
        image.src = imageUrl;
    }, { once: true });

    return image;
}

function getUserIdFromPayload(payload: unknown) {
    if (!payload || typeof payload !== 'object') return null;

    const record = payload as Record<string, unknown>;
    return getStringAttr(record.userId) || getStringAttr(record.id) || null;
}

async function resolveCurrentSignerSignatureUrl(
    signerUserId: string,
    signal: AbortSignal,
) {
    const meResponse = await fetch('/api/me', { credentials: 'include', signal });
    if (!meResponse.ok) return null;

    const currentUserId = getUserIdFromPayload(await meResponse.json().catch(() => null));
    if (currentUserId !== signerUserId) return null;

    return getCurrentSignatureImageUrl();
}

function appendSignatureMark(
    signatureArea: HTMLElement,
    attrs: Record<string, unknown>,
    state: SignatureBlockDomState,
) {
    const signerName = getStringAttr(attrs.signerName) || getStringAttr(attrs.label, 'Signature');
    const signerUserId = getStringAttr(attrs.signerUserId);
    const signatureImageUrl = getStringAttr(attrs.signatureImageUrl).trim();
    const signed = Boolean(getStringAttr(attrs.signatureId) || getStringAttr(attrs.signedAt));
    const renderVersion = state.renderVersion;

    if (isDirectImageUrl(signatureImageUrl)) {
        signatureArea.append(createSignatureImage(signatureImageUrl, signerName, renderVersion, state));
        return;
    }

    if (!signed) return;

    const signedText = createSignatureText();
    signatureArea.append(signedText);

    if (!signerUserId) return;

    state.abortController?.abort();
    state.abortController = new AbortController();
    void resolveCurrentSignerSignatureUrl(signerUserId, state.abortController.signal)
        .then((currentSignatureUrl) => {
            if (state.renderVersion !== renderVersion || !isDirectImageUrl(currentSignatureUrl)) return;

            signedText.replaceWith(
                createSignatureImage(currentSignatureUrl, signerName, renderVersion, state),
            );
        })
        .catch(() => {
            // Keep the signed text fallback when session or image recovery is unavailable.
        });
}

function applySignatureBlockAttributes(dom: HTMLElement, attrs: Record<string, unknown>) {
    const signerName = getStringAttr(attrs.signerName) || getStringAttr(attrs.label, 'Signature');
    const signed = Boolean(getStringAttr(attrs.signatureId) || getStringAttr(attrs.signedAt));

    dom.setAttribute('data-type', 'signature-block');
    dom.setAttribute('aria-label', `${getStringAttr(attrs.label, signerName)} signature block`);
    dom.setAttribute('data-required', String(getBooleanAttr(attrs.required, true)));
    dom.className = `document-signature-block${signed ? ' document-signature-block--signed' : ''}`;
    setOptionalDataAttribute(dom, 'data-block-id', attrs.blockId);
    setOptionalDataAttribute(dom, 'data-signer-user-id', attrs.signerUserId);
    setOptionalDataAttribute(dom, 'data-signer-access-id', attrs.signerAccessId);
    setOptionalDataAttribute(dom, 'data-signer-name', attrs.signerName);
    setOptionalDataAttribute(dom, 'data-signer-email', attrs.signerEmail);
    setOptionalDataAttribute(dom, 'data-signature-id', attrs.signatureId);
    setOptionalDataAttribute(dom, 'data-signed-at', attrs.signedAt);
    setOptionalDataAttribute(dom, 'data-signature-image-url', attrs.signatureImageUrl);
}

function renderSignatureBlockNodeView(
    dom: HTMLElement,
    attrs: Record<string, unknown>,
    state: SignatureBlockDomState,
) {
    state.renderVersion += 1;
    state.abortController?.abort();
    state.abortController = null;

    const signerName = getStringAttr(attrs.signerName) || getStringAttr(attrs.label, 'Signature');
    const signerEmail = getStringAttr(attrs.signerEmail);
    const signedAt = getStringAttr(attrs.signedAt);
    const signedDate = signedAt ? formatSignedDate(signedAt) : null;
    const signatureArea = document.createElement('div');
    const signatureLine = document.createElement('span');
    const meta = document.createElement('div');
    const signerNameElement = document.createElement('strong');

    applySignatureBlockAttributes(dom, attrs);
    signatureArea.className = 'document-signature-block__signature-area';
    signatureLine.className = 'document-signature-block__line';
    meta.className = 'document-signature-block__meta';
    signerNameElement.textContent = signerName;

    appendSignatureMark(signatureArea, attrs, state);
    signatureArea.append(signatureLine);
    meta.append(signerNameElement);

    if (signerEmail) {
        const email = document.createElement('span');
        email.textContent = signerEmail;
        meta.append(email);
    }

    if (signedDate) {
        const date = document.createElement('span');
        date.className = 'document-signature-block__date';
        date.textContent = `Signed ${signedDate}`;
        meta.append(date);
    }

    clearElement(dom);
    dom.append(signatureArea, meta);
}

function createSignatureBlockNodeView({ node }: NodeViewRendererProps): NodeView {
    const dom = document.createElement('section');
    const state: SignatureBlockDomState = {
        abortController: null,
        renderVersion: 0,
    };

    renderSignatureBlockNodeView(dom, node.attrs, state);

    return {
        dom,
        update(nextNode) {
            if (nextNode.type.name !== node.type.name) return false;

            renderSignatureBlockNodeView(dom, nextNode.attrs, state);
            return true;
        },
        selectNode() {
            dom.classList.add('ProseMirror-selectednode');
        },
        deselectNode() {
            dom.classList.remove('ProseMirror-selectednode');
        },
        destroy() {
            state.abortController?.abort();
        },
        ignoreMutation() {
            return true;
        },
    };
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
        return createSignatureBlockNodeView;
    },
});
