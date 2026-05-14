'use client';

import type { CSSProperties } from 'react';
import styles from './DocumentLoadingState.module.css';

type DocumentLoadingStateVariant = 'fullscreen' | 'panel' | 'paper';

interface DocumentLoadingStateProps {
    message?: string;
    variant?: DocumentLoadingStateVariant;
    size?: number;
    minHeight?: string;
    className?: string;
}

export function DocumentLoadingState({
    message,
    variant = 'panel',
    size = 36,
    minHeight,
    className,
}: DocumentLoadingStateProps) {
    const style = {
        '--document-loading-size': `${size}px`,
        ...(minHeight ? { '--document-loading-min-height': minHeight } : {}),
    } as CSSProperties;
    const classNames = [
        styles.state,
        styles[variant],
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classNames} style={style} role="status" aria-live="polite">
            <div className={styles.content}>
                <span className={styles.spinner} aria-hidden="true" />
                {message ? <p className={styles.message}>{message}</p> : null}
            </div>
        </div>
    );
}
