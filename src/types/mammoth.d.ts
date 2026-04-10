/**
 * Minimal TypeScript declarations for the `mammoth` .docx-to-HTML converter.
 * mammoth does not ship its own .d.ts files, so we declare only what we use.
 */
declare module 'mammoth' {
    interface ConvertOptions {
        styleMap?: string[];
        includeDefaultStyleMap?: boolean;
    }

    interface ConversionResult {
        /** The converted HTML string. */
        value: string;
        /** Non-fatal warnings produced during conversion. */
        messages: { type: string; message: string }[];
    }

    /** Converts a .docx ArrayBuffer to an HTML string. */
    export function convertToHtml(
        input: { arrayBuffer: ArrayBuffer },
        options?: ConvertOptions,
    ): Promise<ConversionResult>;
}
