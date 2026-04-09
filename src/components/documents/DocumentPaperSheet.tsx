import type { ReactNode } from 'react';

interface DocumentPaperSheetProps {
    children: ReactNode;
    eyebrow?: string;
    title?: string;
    meta?: ReactNode;
    footer?: ReactNode;
    className?: string;
    bodyClassName?: string;
    /**
     * Rendered as an absolutely-positioned layer that fills the entire paper sheet.
     * The overlay container itself has pointer-events:none so document content
     * below remains interactive. Individual elements inside the overlay must
     * set pointer-events:auto to receive events (e.g. the draggable signature card).
     */
    overlay?: ReactNode;
}

export function DocumentPaperSheet({
    children,
    eyebrow,
    title,
    meta,
    footer,
    className,
    bodyClassName,
    overlay,
}: DocumentPaperSheetProps) {
    const sheetClassName = className
        ? `document-paper-sheet ${className}`
        : 'document-paper-sheet';

    const contentClassName = bodyClassName
        ? `document-paper-sheet__body ${bodyClassName}`
        : 'document-paper-sheet__body';

    return (
        <section className={sheetClassName}>
            {(eyebrow || title || meta) && (
                <header className="document-paper-sheet__header">
                    <div style={{ display: 'grid', gap: 4 }}>
                        {eyebrow && (
                            <span className="document-paper-sheet__eyebrow">{eyebrow}</span>
                        )}
                        {title && (
                            <h3 className="document-paper-sheet__title">{title}</h3>
                        )}
                    </div>

                    {meta && (
                        <div className="document-paper-sheet__meta">
                            {meta}
                        </div>
                    )}
                </header>
            )}

            <div className={contentClassName}>{children}</div>

            {footer && (
                <footer className="document-paper-sheet__footer">
                    {footer}
                </footer>
            )}

            {/* Absolute overlay — signature drag layer, tooltips, etc.
                pointer-events:none on the wrapper; elements inside opt in with pointer-events:auto */}
            {overlay}
        </section>
    );
}
