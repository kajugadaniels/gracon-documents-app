/**
 * Renders the document-number confirmation step for identity verification.
 */

import type {
    ChangeEvent,
    FormEvent,
} from 'react';
import { Button, Input } from '@/components/ui';

type VerificationIdentityStepProps = {
    title: string;
    description: string;
    error?: string;
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
};

/**
 * Collects the 16-digit national ID before photo capture begins.
 */
export function VerificationIdentityStep({
    title,
    description,
    error,
    value,
    onChange,
    onSubmit,
}: VerificationIdentityStepProps) {
    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        onChange(event.target.value.replace(/\D/g, '').slice(0, 16));
    }

    function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        onSubmit();
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h1
                    style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        marginBottom: 8,
                        letterSpacing: '-0.02em',
                    }}
                >
                    {title}
                </h1>
                <p
                    style={{
                        fontSize: 14,
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.6,
                    }}
                >
                    {description}
                </p>
            </div>

            <form
                onSubmit={handleFormSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
                noValidate
            >
                <Input
                    label="National ID number"
                    placeholder="Enter your 16-digit NID"
                    maxLength={16}
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    hint="This must match the ID you used when registering"
                    error={error}
                    value={value}
                    onChange={handleInputChange}
                />

                <Button type="submit" fullWidth size="lg">
                    Continue
                </Button>
            </form>
        </div>
    );
}
