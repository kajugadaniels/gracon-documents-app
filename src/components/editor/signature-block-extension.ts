import { mergeAttributes, Node } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';

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
        };
    }
}

function getStringAttr(value: unknown, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}

function getBooleanAttr(value: unknown, fallback = true) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value !== 'false';
    return fallback;
}

function renderSignatureBlock(HTMLAttributes: Record<string, unknown>): DOMOutputSpec {
    const signerName = getStringAttr(HTMLAttributes.signerName)
        || getStringAttr(HTMLAttributes.label, 'Signature');
    const signerRole = getStringAttr(HTMLAttributes.signerRole, 'Required signer');
    const signerEmail = getStringAttr(HTMLAttributes.signerEmail);
    const signatureImageUrl = getStringAttr(HTMLAttributes.signatureImageUrl);
    const signedAt = getStringAttr(HTMLAttributes.signedAt);
    const signatureId = getStringAttr(HTMLAttributes.signatureId);
    const signed = Boolean(signatureId || signedAt || signatureImageUrl);
    const statusLabel = signed ? 'Signed' : 'Pending';

    return [
        'div',
        mergeAttributes(HTMLAttributes, {
            'data-type': 'signature-block',
            class: `document-signature-block${signed ? ' document-signature-block--signed' : ''}`,
        }),
        [
            'div',
            { class: 'document-signature-block__signature-area' },
            ['span', { class: 'document-signature-block__line' }],
            signatureImageUrl
                ? ['img', {
                    class: 'document-signature-block__image',
                    src: signatureImageUrl,
                    alt: `${signerName} signature`,
                }]
                : ['span', { class: 'document-signature-block__signed-text' }, signed ? signerName : ''],
        ],
        [
            'div',
            { class: 'document-signature-block__meta' },
            ['strong', {}, signerName],
            ['span', {}, signerEmail ? `${signerRole} · ${signerEmail}` : signerRole],
        ],
        ['em', {}, statusLabel],
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
        };
    },
});
