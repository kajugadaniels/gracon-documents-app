'use client';

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { PremiumLoader } from './Loader';

type ButtonVariant = 'primary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    loadingText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: { padding: '6px 16px', fontSize: 12, borderRadius: 9999 },
    md: { padding: '9px 22px', fontSize: 12, borderRadius: 9999 },
    lg: { padding: '11px 28px', fontSize: 12, borderRadius: 9999 },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            loading = false,
            loadingText,
            leftIcon,
            rightIcon,
            fullWidth = false,
            children,
            disabled,
            style,
            ...rest
        },
        ref,
    ) => {
        const isDisabled = disabled || loading;

        return (
            <button
                ref={ref}
                className={variant === 'primary' ? 'btn-primary' : 'btn-ghost'}
                disabled={isDisabled}
                aria-busy={loading}
                style={{
                    ...sizeStyles[size],
                    width: fullWidth ? '100%' : undefined,
                    ...style,
                }}
                {...rest}
            >
                {!loading && leftIcon && (
                    <span
                        aria-hidden="true"
                        style={{ flexShrink: 0, display: 'flex' }}
                    >
                        {leftIcon}
                    </span>
                )}

                {loading && <PremiumLoader size={15} color="white" />}

                <span>{loading && loadingText ? loadingText : children}</span>

                {!loading && rightIcon && (
                    <span
                        aria-hidden="true"
                        style={{ flexShrink: 0, display: 'flex' }}
                    >
                        {rightIcon}
                    </span>
                )}
            </button>
        );
    },
);

Button.displayName = 'Button';
