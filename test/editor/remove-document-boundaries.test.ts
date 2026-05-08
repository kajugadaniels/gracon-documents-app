import assert from 'node:assert/strict';
import { test } from 'node:test';
import { removeDocumentBoundariesFromTiptapContent } from '../../src/lib/remove-document-boundaries.ts';

test('removeDocumentBoundariesFromTiptapContent strips legacy page and section nodes', () => {
    const content = {
        type: 'doc',
        content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
            { type: 'pageBreak' },
            { type: 'sectionBreak' },
            { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
        ],
    };

    assert.deepEqual(removeDocumentBoundariesFromTiptapContent(content), {
        type: 'doc',
        content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
        ],
    });
});

test('removeDocumentBoundariesFromTiptapContent keeps an editable empty document', () => {
    assert.deepEqual(removeDocumentBoundariesFromTiptapContent({
        type: 'doc',
        content: [{ type: 'pageBreak' }],
    }), {
        type: 'doc',
        content: [{ type: 'paragraph' }],
    });
});
