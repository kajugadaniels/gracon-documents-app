export interface UploadedEditorImage {
    url: string;
    publicId?: string;
    bytes?: number;
    width?: number;
    height?: number;
    format?: string;
    resourceType?: string;
}

/**
 * Uploads a local editor image through the documents app proxy route.
 *
 * @param file - Browser-selected image file.
 * @returns Cloudinary-hosted image metadata.
 */
export async function uploadEditorImage(file: File): Promise<UploadedEditorImage> {
    const formData = new FormData();
    formData.set('file', file);

    const response = await fetch('/api/editor-images/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            typeof payload?.error === 'string' && payload.error.trim()
                ? payload.error
                : 'Failed to upload image.',
        );
    }

    if (typeof payload?.url !== 'string' || !payload.url) {
        throw new Error('Image upload did not return a usable URL.');
    }

    return payload as UploadedEditorImage;
}
