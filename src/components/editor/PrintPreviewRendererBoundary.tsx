'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface PrintPreviewRendererBoundaryProps {
    children: ReactNode;
    fallback: ReactNode;
    resetKey: string;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface PrintPreviewRendererBoundaryState {
    hasError: boolean;
}

export class PrintPreviewRendererBoundary extends Component<
    PrintPreviewRendererBoundaryProps,
    PrintPreviewRendererBoundaryState
> {
    state: PrintPreviewRendererBoundaryState = { hasError: false };

    static getDerivedStateFromError(): PrintPreviewRendererBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.props.onError?.(error, errorInfo);
    }

    componentDidUpdate(previousProps: PrintPreviewRendererBoundaryProps) {
        if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
            this.setState({ hasError: false });
        }
    }

    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}
