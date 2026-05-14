'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './DocumentSurfaceErrorBoundary.module.css';

type DocumentSurfaceKind = 'editor' | 'preview';

interface DocumentSurfaceErrorBoundaryProps {
    children: ReactNode;
    surface: DocumentSurfaceKind;
    resetKey: string;
    onReset?: () => void;
    onClose?: () => void;
}

interface DocumentSurfaceErrorBoundaryState {
    error: Error | null;
}

function getSurfaceCopy(surface: DocumentSurfaceKind) {
    if (surface === 'preview') {
        return {
            eyebrow: 'Preview recovery',
            title: 'Print preview could not render this document',
            message: 'The editor is still available. Close the preview or try rendering it again after the document content settles.',
            retryLabel: 'Retry preview',
        };
    }

    return {
        eyebrow: 'Editor recovery',
        title: 'The editor could not render this document',
        message: 'The document app stayed open. Try reloading the editor surface; if this repeats, the imported content may include an unsupported image, table, or extension node.',
        retryLabel: 'Reload editor',
    };
}

/**
 * Keeps risky document rendering surfaces from crashing the whole app shell.
 */
export class DocumentSurfaceErrorBoundary extends Component<
    DocumentSurfaceErrorBoundaryProps,
    DocumentSurfaceErrorBoundaryState
> {
    state: DocumentSurfaceErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): DocumentSurfaceErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Document surface render failed.', {
                surface: this.props.surface,
                error,
                errorInfo,
            });
        }
    }

    componentDidUpdate(previousProps: DocumentSurfaceErrorBoundaryProps) {
        if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
            this.setState({ error: null });
        }
    }

    handleReset = () => {
        this.props.onReset?.();
        this.setState({ error: null });
    };

    render() {
        const { error } = this.state;

        if (!error) return this.props.children;

        const copy = getSurfaceCopy(this.props.surface);
        const className = [
            styles.surfaceFallback,
            this.props.surface === 'preview' ? styles.surfaceFallbackPreview : '',
        ].filter(Boolean).join(' ');

        return (
            <div className={className} role="alert">
                <section className={styles.panel} aria-live="polite">
                    <p className={styles.eyebrow}>{copy.eyebrow}</p>
                    <h2 className={styles.title}>{copy.title}</h2>
                    <p className={styles.message}>{copy.message}</p>
                    {process.env.NODE_ENV !== 'production' && (
                        <p className={styles.technical}>{error.message}</p>
                    )}
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.buttonPrimary}
                            onClick={this.handleReset}
                        >
                            {copy.retryLabel}
                        </button>
                        {this.props.onClose && (
                            <button
                                type="button"
                                className={styles.buttonSecondary}
                                onClick={this.props.onClose}
                            >
                                Close preview
                            </button>
                        )}
                    </div>
                </section>
            </div>
        );
    }
}
