'use client';

/**
 * Modal editor for persisted page margins.
 *
 * This is the user-facing control surface for the document layout model.
 * It updates the same layout data consumed by the editor paper, ruler, PDF,
 * and DOCX export layers so page geometry stays consistent.
 */
import { useMemo, useState } from 'react';
import type { DocumentLayout } from '@/lib/document-layout';

interface DocumentPageSetupDialogProps {
    layout: DocumentLayout;
    saving: boolean;
    onClose: () => void;
    onSave: (layout: DocumentLayout) => void | Promise<void>;
}

type MarginField = 'top' | 'right' | 'bottom' | 'left';

const DPI = 96;
const A4_WIDTH_IN = 8.27;
const A4_HEIGHT_IN = 11.69;
const PRESETS: Array<{ label: string; inches: number }> = [
    { label: 'Narrow', inches: 0.5 },
    { label: 'Normal', inches: 1 },
    { label: 'Wide', inches: 1.5 },
];

function pxToInches(px: number) {
    return Number((px / DPI).toFixed(2));
}

function inchesToPx(inches: number) {
    return Math.round(inches * DPI);
}

function clampInches(value: number) {
    return Math.min(2, Math.max(0.5, Number(value.toFixed(2))));
}

export function DocumentPageSetupDialog({
    layout,
    saving,
    onClose,
    onSave,
}: DocumentPageSetupDialogProps) {
    const [margins, setMargins] = useState({
        top: pxToInches(layout.margins.top).toFixed(2),
        right: pxToInches(layout.margins.right).toFixed(2),
        bottom: pxToInches(layout.margins.bottom).toFixed(2),
        left: pxToInches(layout.margins.left).toFixed(2),
    });

    const parsedMargins = useMemo(() => {
        const parseValue = (value: string, fallback: number) => {
            const parsed = Number.parseFloat(value);
            if (!Number.isFinite(parsed)) return fallback;
            return clampInches(parsed);
        };

        return {
            top: parseValue(margins.top, pxToInches(layout.margins.top)),
            right: parseValue(margins.right, pxToInches(layout.margins.right)),
            bottom: parseValue(margins.bottom, pxToInches(layout.margins.bottom)),
            left: parseValue(margins.left, pxToInches(layout.margins.left)),
        };
    }, [layout.margins.bottom, layout.margins.left, layout.margins.right, layout.margins.top, margins]);

    const hasChanges = useMemo(() => (
        inchesToPx(parsedMargins.top) !== layout.margins.top ||
        inchesToPx(parsedMargins.right) !== layout.margins.right ||
        inchesToPx(parsedMargins.bottom) !== layout.margins.bottom ||
        inchesToPx(parsedMargins.left) !== layout.margins.left
    ), [layout.margins.bottom, layout.margins.left, layout.margins.right, layout.margins.top, parsedMargins]);

    function handleMarginChange(field: MarginField, value: string) {
        setMargins((current) => ({ ...current, [field]: value }));
    }

    function applyPreset(inches: number) {
        const value = clampInches(inches).toFixed(2);
        setMargins({
            top: value,
            right: value,
            bottom: value,
            left: value,
        });
    }

    function submit() {
        void onSave({
            paperSize: 'A4',
            margins: {
                top: inchesToPx(parsedMargins.top),
                right: inchesToPx(parsedMargins.right),
                bottom: inchesToPx(parsedMargins.bottom),
                left: inchesToPx(parsedMargins.left),
            },
        });
    }

    const previewStyle = {
        top: `${(parsedMargins.top / A4_HEIGHT_IN) * 100}%`,
        right: `${(parsedMargins.right / A4_WIDTH_IN) * 100}%`,
        bottom: `${(parsedMargins.bottom / A4_HEIGHT_IN) * 100}%`,
        left: `${(parsedMargins.left / A4_WIDTH_IN) * 100}%`,
    };

    return (
        <div className="docs-page-setup__backdrop" role="dialog" aria-modal="true" aria-labelledby="docs-page-setup-title">
            <div className="docs-page-setup">
                <div className="docs-page-setup__header">
                    <div>
                        <p className="docs-page-setup__eyebrow">Page layout</p>
                        <h2 id="docs-page-setup-title" className="docs-page-setup__title">
                            Page setup
                        </h2>
                        <p className="docs-page-setup__copy">
                            These margins drive the editor paper, ruler visuals, PDF export, and DOCX export together.
                        </p>
                    </div>
                    <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
                        Close
                    </button>
                </div>

                <div className="docs-page-setup__body">
                    <div className="docs-page-setup__controls">
                        <div className="docs-page-setup__section">
                            <span className="docs-page-setup__section-label">Presets</span>
                            <div className="docs-page-setup__preset-row">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        className="docs-page-setup__preset"
                                        onClick={() => applyPreset(preset.inches)}
                                        disabled={saving}
                                    >
                                        <strong>{preset.label}</strong>
                                        <span>{preset.inches.toFixed(2)} in</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="docs-page-setup__section">
                            <span className="docs-page-setup__section-label">Margins</span>
                            <div className="docs-page-setup__grid">
                                {(['top', 'right', 'bottom', 'left'] as MarginField[]).map((field) => (
                                    <label key={field} className="docs-page-setup__field">
                                        <span>{field.charAt(0).toUpperCase() + field.slice(1)}</span>
                                        <div className="docs-page-setup__field-input">
                                            <input
                                                type="number"
                                                min={0.5}
                                                max={2}
                                                step={0.05}
                                                value={margins[field]}
                                                onChange={(event) => handleMarginChange(field, event.target.value)}
                                                disabled={saving}
                                            />
                                            <small>in</small>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="docs-page-setup__preview-wrap">
                        <span className="docs-page-setup__section-label">Preview</span>
                        <div className="docs-page-setup__preview">
                            <div className="docs-page-setup__preview-sheet">
                                <div className="docs-page-setup__preview-safe" style={previewStyle}>
                                    <span />
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            </div>
                            <p className="docs-page-setup__preview-note">
                                Printable area updates live as you change the numbers.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="docs-page-setup__footer">
                    <p className="docs-page-setup__footnote">
                        Allowed range: 0.50 in to 2.00 in per side.
                    </p>
                    <div className="docs-page-setup__actions">
                        <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={submit}
                            disabled={saving || !hasChanges}
                        >
                            {saving ? 'Saving…' : 'Save page setup'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
