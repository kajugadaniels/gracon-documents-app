import ImageResize from 'tiptap-extension-resize-image';

/**
 * Uses tiptap-extension-resize-image while preserving the existing `image`
 * node name used by saved Gracon documents and DOCX import parsing.
 */
export const ResizableImageExtension = ImageResize.extend({
    name: 'image',
});
