'use client';

import { InputHTMLAttributes, forwardRef, ReactNode, useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            error,
            hint,
            leftIcon,
            rightIcon,
            showPasswordToggle = false,
            type = 'text',
            id,
            style,
            ...rest
        },
        ref,
    ) => {
        const [showPassword, setShowPassword] = useState(false);
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

        const resolvedType = showPasswordToggle
            ? showPassword
                ? 'text'
                : 'password'
            : type;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {label && (
                    <label
                        htmlFor={inputId}
                        style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--color-text-secondary)',
                            letterSpacing: '0.01em',
                        }}
                    >
                        {label}
                        {rest.required && (
                            <span
                                aria-hidden="true"
                                style={{
                                    color: 'var(--color-primary)',
                                    marginLeft: 3,
                                }}
                            >
                                *
                            </span>
                        )}
                    </label>
                )}

                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {leftIcon && (
                        <span
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                left: 14,
                                color: 'var(--color-text-muted)',
                                display: 'flex',
                                pointerEvents: 'none',
                            }}
                        >
                            {leftIcon}
                        </span>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        type={resolvedType}
                        className={`input-glass${error ? ' error' : ''}`}
                        style={{
                            paddingLeft: leftIcon ? 44 : 16,
                            paddingRight:
                                rightIcon || showPasswordToggle ? 44 : 16,
                            ...style,
                        }}
                        aria-invalid={!!error}
                        aria-describedby={
                            error
                                ? `${inputId}-error`
                                : hint
                                  ? `${inputId}-hint`
                                  : undefined
                        }
                        {...rest}
                    />

                    {(rightIcon || showPasswordToggle) && (
                        <span
                            aria-hidden={!showPasswordToggle}
                            style={{
                                position: 'absolute',
                                right: 14,
                                color: 'var(--color-text-muted)',
                                display: 'flex',
                                cursor: showPasswordToggle ? 'pointer' : 'default',
                            }}
                            onClick={
                                showPasswordToggle
                                    ? () => setShowPassword((previous) => !previous)
                                    : undefined
                            }
                        >
                            {showPasswordToggle ? (
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    {showPassword ? (
                                        <>
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </>
                                    ) : (
                                        <>
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </>
                                    )}
                                </svg>
                            ) : (
                                rightIcon
                            )}
                        </span>
                    )}
                </div>

                {error && (
                    <p
                        id={`${inputId}-error`}
                        role="alert"
                        style={{
                            fontSize: 12,
                            color: 'var(--color-error)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            margin: 0,
                        }}
                    >
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        {error}
                    </p>
                )}

                {hint && !error && (
                    <p
                        id={`${inputId}-hint`}
                        style={{
                            fontSize: 12,
                            color: 'var(--color-text-muted)',
                            margin: 0,
                        }}
                    >
                        {hint}
                    </p>
                )}
            </div>
        );
    },
);

Input.displayName = 'Input';
