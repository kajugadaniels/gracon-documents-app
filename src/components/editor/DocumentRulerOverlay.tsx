'use client';

const HORIZONTAL_TICKS = Array.from({ length: 17 }, (_, index) => index);
const VERTICAL_TICKS = Array.from({ length: 23 }, (_, index) => index);

interface DocumentRulerOverlayProps {
    height: number;
}

function isMajorTick(index: number) {
    return index % 2 === 0;
}

export function DocumentRulerOverlay({ height }: DocumentRulerOverlayProps) {
    return (
        <div className="document-ruler-overlay" aria-hidden="true">
            <div className="document-ruler document-ruler--top">
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
