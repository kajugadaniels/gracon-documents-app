'use client';

import { Toaster, toast as sonnerToast } from 'sonner';

export function AppToaster() {
    return (
        <Toaster
            position="top-right"
            gap={10}
            toastOptions={{
                style: {
                    background: 'rgba(10, 8, 28, 0.88)',
                    backdropFilter: 'blur(32px)',
                    WebkitBackdropFilter: 'blur(32px)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 16,
                    color: '#f0eeff',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 14,
                    fontWeight: 400,
                    padding: '16px 18px',
                    boxShadow:
                        '0 24px 60px rgba(0,0,0,0.55), 0 6px 20px rgba(0,0,0,0.28)',
                    minWidth: 320,
                    maxWidth: 420,
                    overflow: 'hidden',
                    position: 'relative',
                },
            }}
        />
    );
}

function CheckIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0 }}
        >
            <path
                d="M4.5 12.5l5 5L19.5 7"
                stroke="#34d399"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function XIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0 }}
        >
            <path
                d="M6 6l12 12M18 6L6 18"
                stroke="#f87171"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

function InfoIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0 }}
        >
            <circle cx="12" cy="7.5" r="1.3" fill="#93c5fd" />
            <path
                d="M12 11.5v5.5"
                stroke="#93c5fd"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

function WarningIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0 }}
        >
            <path
                d="M12 4L2.5 20h19L12 4z"
                stroke="#fbbf24"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M12 10v4.5"
                stroke="#fbbf24"
                strokeWidth="2.2"
                strokeLinecap="round"
            />
            <circle cx="12" cy="16.5" r="1" fill="#fbbf24" />
        </svg>
    );
}

function LoadingIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0 }}
        >
            <circle
                cx="12"
                cy="12"
                r="8"
                stroke="rgba(196,181,253,0.28)"
                strokeWidth="2.5"
            />
            <path
                d="M12 4a8 8 0 0 1 8 8"
                stroke="#c4b5fd"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

function CloseButton({ toastId }: { toastId: string | number }) {
    return (
        <button
            onClick={() => sonnerToast.dismiss(toastId)}
            aria-label="Close notification"
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: 'rgba(200,195,230,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                flexShrink: 0,
                marginTop: 1,
                transition: 'color 150ms ease, background 150ms ease',
            }}
            onMouseEnter={(event) => {
                event.currentTarget.style.color = 'rgba(200,195,230,0.85)';
                event.currentTarget.style.background = 'rgba(255,255,255,0.07)';
            }}
            onMouseLeave={(event) => {
                event.currentTarget.style.color = 'rgba(200,195,230,0.35)';
                event.currentTarget.style.background = 'none';
            }}
        >
            <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        </button>
    );
}

interface ToastContentProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    id: string | number;
    accentColor: string;
    accentGlow: string;
    accentBorder: string;
}

function ToastContent({
    icon,
    title,
    description,
    id,
    accentColor,
    accentGlow,
    accentBorder,
}: ToastContentProps) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                width: '100%',
                position: 'relative',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: -16,
                    left: -18,
                    bottom: -16,
                    width: '60%',
                    background: `radial-gradient(ellipse 100% 130% at 0% 50%, ${accentGlow} 0%, transparent 65%)`,
                    pointerEvents: 'none',
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    top: -16,
                    left: -18,
                    right: -18,
                    height: 1.5,
                    background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}80 35%, transparent 70%)`,
                    pointerEvents: 'none',
                }}
            />

            <div
                style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: accentGlow,
                    border: `1px solid ${accentBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                    marginTop: 1,
                }}
            >
                {icon}
            </div>

            <div
                style={{
                    flex: 1,
                    minWidth: 0,
                    position: 'relative',
                    zIndex: 1,
                    paddingTop: description ? 2 : 7,
                }}
            >
                <div
                    style={{
                        fontWeight: 600,
                        fontSize: 13.5,
                        color: '#f0eeff',
                        lineHeight: 1.3,
                        marginBottom: description ? 4 : 0,
                        letterSpacing: '0.01em',
                    }}
                >
                    {title}
                </div>
                {description && (
                    <div
                        style={{
                            fontSize: 12.5,
                            color: 'rgba(200,195,230,0.65)',
                            lineHeight: 1.5,
                            letterSpacing: '0.005em',
                        }}
                    >
                        {description}
                    </div>
                )}
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
                <CloseButton toastId={id} />
            </div>
        </div>
    );
}

interface ToastOptions {
    description?: string;
    duration?: number;
}

export const toast = {
    success: (title: string, options: ToastOptions = {}) =>
        sonnerToast.custom(
            (id) => (
                <ToastContent
                    id={id}
                    icon={<CheckIcon />}
                    title={title}
                    description={options.description}
                    accentColor="#34d399"
                    accentGlow="rgba(52,211,153,0.14)"
                    accentBorder="rgba(52,211,153,0.24)"
                />
            ),
            { duration: options.duration ?? 4000 },
        ),

    error: (title: string, options: ToastOptions = {}) =>
        sonnerToast.custom(
            (id) => (
                <ToastContent
                    id={id}
                    icon={<XIcon />}
                    title={title}
                    description={options.description}
                    accentColor="#f87171"
                    accentGlow="rgba(248,113,113,0.13)"
                    accentBorder="rgba(248,113,113,0.24)"
                />
            ),
            { duration: options.duration ?? 5000 },
        ),

    info: (title: string, options: ToastOptions = {}) =>
        sonnerToast.custom(
            (id) => (
                <ToastContent
                    id={id}
                    icon={<InfoIcon />}
                    title={title}
                    description={options.description}
                    accentColor="#93c5fd"
                    accentGlow="rgba(147,197,253,0.13)"
                    accentBorder="rgba(147,197,253,0.22)"
                />
            ),
            { duration: options.duration ?? 4000 },
        ),

    warning: (title: string, options: ToastOptions = {}) =>
        sonnerToast.custom(
            (id) => (
                <ToastContent
                    id={id}
                    icon={<WarningIcon />}
                    title={title}
                    description={options.description}
                    accentColor="#fbbf24"
                    accentGlow="rgba(251,191,36,0.11)"
                    accentBorder="rgba(251,191,36,0.22)"
                />
            ),
            { duration: options.duration ?? 4500 },
        ),

    loading: (title: string, options: ToastOptions = {}) =>
        sonnerToast.custom(
            (id) => (
                <ToastContent
                    id={id}
                    icon={<LoadingIcon />}
                    title={title}
                    description={options.description}
                    accentColor="#c4b5fd"
                    accentGlow="rgba(196,181,253,0.14)"
                    accentBorder="rgba(196,181,253,0.24)"
                />
            ),
            { duration: options.duration ?? 60000 },
        ),

    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
};
