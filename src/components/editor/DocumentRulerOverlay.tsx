'use client';

import type { DocumentLayoutMargins } from '@/lib/document-layout';

const HORIZONTAL_TICKS = Array.from({ length: 17 }, (_, index) => index);
const VERTICAL_TICKS = Array.from({ length: 23 }, (_, index) => index);

interface DocumentRulerOverlayProps {
    width: number;
    height: number;
    margins: DocumentLayoutMargins;
}

function isMajorTick(index: number) {
    return index % 2 === 0;
}

export function DocumentRulerOverlay({ width, height, margins }: DocumentRulerOverlayProps) {
    const leftMarginPercent = (margins.left / width) * 100;
    const rightMarginPercent = (margins.right / width) * 100;
    const topMarginPercent = (margins.top / height) * 100;
    const bottomMarginPercent = (margins.bottom / height) * 100;

    return (
        <div className="document-ruler-overlay" aria-hidden="true">
            <div className="document-ruler document-ruler--top">
                <span
                    className="document-ruler__margin-zone document-ruler__margin-zone--left"
                    style={{ width: `${leftMarginPercent}%` }}
                />
                <span
                    className="document-ruler__margin-zone document-ruler__margin-zone--right"
                    style={{ width: `${rightMarginPercent}%` }}
                />
                {HORIZONTAL_TICKS.map((tick) => (
                    <span
                        key={`top-${tick}`}
                        className={`document-ruler__tick${isMajorTick(tick) ? ' document-ruler__tick--major' : ''}`}
                        style={{ left: `${(tick / (HORIZONTAL_TICKS.length - 1)) * 100}%` }}
                    >
                        {isMajorTick(tick) && (
                            <span className="document-ruler__label">{tick / 2}</span>
                        )}
                    </span>
                ))}
            </div>

            <div className="document-ruler document-ruler--left" style={{ height }}>
                <span
                    className="document-ruler__margin-zone document-ruler__margin-zone--top"
                    style={{ height: `${topMarginPercent}%` }}
                />
                <span
                    className="document-ruler__margin-zone document-ruler__margin-zone--bottom"
                    style={{ height: `${bottomMarginPercent}%` }}
                />
                {VERTICAL_TICKS.map((tick) => (
                    <span
                        key={`left-${tick}`}
                        className={`document-ruler__tick${isMajorTick(tick) ? ' document-ruler__tick--major' : ''}`}
                        style={{ top: `${(tick / (VERTICAL_TICKS.length - 1)) * 100}%` }}
                    >
                        {isMajorTick(tick) && (
                            <span className="document-ruler__label">{tick / 2}</span>
                        )}
                    </span>
                ))}
            </div>
        </div>
    );
}
