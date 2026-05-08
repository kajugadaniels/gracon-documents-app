/**
 * Utilities for removing legacy page and section boundary nodes from TipTap JSON.
 *
 * The document editor now treats the document as one continuous editable surface,
 * so old saved pageBreak/sectionBreak nodes must not be rendered or re-exported.
 */

const REMOVED_BOUNDARY_NODE_TYPES = new Set(['pageBreak', 'sectionBreak']);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripNode(node: Record<string, unknown>): Record<string, unknown> | null {
    const nodeType = node.type;
    if (typeof nodeType === 'string' && REMOVED_BOUNDARY_NODE_TYPES.has(nodeType)) {
        return null;
    }

    const content = node.content;
    if (!Array.isArray(content)) return node;

    let changed = false;
    const nextContent: unknown[] = [];

    content.forEach((child) => {
        if (!isRecord(child)) {
            nextContent.push(child);
            return;
        }

        const nextChild = stripNode(child);
        if (nextChild) {
            nextContent.push(nextChild);
        } else {
            changed = true;
        }

        if (nextChild !== child) changed = true;
    });

    if (!changed) return node;

    return {
        ...node,
        content: nextContent,
    };
}

/**
 * Returns TipTap JSON with legacy manual page/section boundaries removed.
 */
export function removeDocumentBoundariesFromTiptapContent(
    content: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
    if (!content) return null;

    const stripped = stripNode(content);
    if (!stripped) {
        return { type: 'doc', content: [{ type: 'paragraph' }] };
    }

    if (stripped.type === 'doc' && Array.isArray(stripped.content) && stripped.content.length === 0) {
        return { ...stripped, content: [{ type: 'paragraph' }] };
    }

    return stripped;
}
