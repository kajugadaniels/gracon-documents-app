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
 * Uploads a local editor image through api/documents.
 *
 * @param file - Browser-selected image file.
 * @returns Cloudinary-hosted image metadata.
 */
export async function uploadEditorImage(file: File): Promise<UploadedEditorImage> {
    const formData = new FormData();
    formData.set('file', file);

    try {
        const response = await apiClient.post<UploadedEditorImage>(
            '/editor-images/upload',
            formData,
            { timeout: 60_000 },
        );

        if (!response.data?.url) {
            throw new Error('Image upload did not return a usable URL.');
        }

        return response.data;
    } catch (error: unknown) {
        const message = (error as { response?: { data?: { message?: string; error?: string } } })
            ?.response?.data?.message
            ?? (error as { response?: { data?: { error?: string } } })?.response?.data?.error;

        throw new Error(
            typeof message === 'string' && message.trim()
                ? message
                : error instanceof Error
                    ? error.message
                    : 'Failed to upload image.',
        );
    }
}
import { apiClient } from './client';
