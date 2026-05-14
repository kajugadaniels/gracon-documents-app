'use client';

import type { CSSProperties } from 'react';
import styles from './DocumentLoadingState.module.css';

type DocumentLoadingStateVariant = 'fullscreen' | 'panel' | 'paper';

interface DocumentLoadingStateProps {
    message?: string;
    detail?: string;
    variant?: DocumentLoadingStateVariant;
    size?: number;
    minHeight?: string;
    className?: string;
}

export function DocumentLoadingState({
    message = 'Preparing document...',
    detail = 'Laying out content and secure document state',
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
                <div className={styles.documentPreview} aria-hidden="true">
                    <div className={styles.sheet}>
                        <span className={styles.sheetHeader} />
                        <span className={styles.lineLong} />
                        <span className={styles.lineMedium} />
                        <span className={styles.lineShort} />
                        <span className={styles.lineLong} />
                    </div>
                    <span className={styles.statusDot} />
                </div>
                <div className={styles.textBlock}>
                    <p className={styles.message}>{message}</p>
                    {detail ? <span className={styles.detail}>{detail}</span> : null}
                </div>
                <span className={styles.progressTrack} aria-hidden="true">
                    <span className={styles.progressBar} />
                </span>
            </div>
        </div>
    );
}
