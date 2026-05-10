/**
 * DocumentTabsPanel renders a compact heading navigation rail for the editor.
 */
'use client';

import type { CSSProperties } from 'react';

export interface DocumentTabItem {
    id: string;
    label: string;
    pageNumber: number;
    level: number;
}

interface DocumentTabsPanelProps {
    tabs: DocumentTabItem[];
    activeTabId: string | null;
    onSelectTab: (tab: DocumentTabItem) => void;
}

/**
 * Shows document heading tabs with page references and scroll navigation.
 */
export function DocumentTabsPanel({ tabs, activeTabId, onSelectTab }: DocumentTabsPanelProps) {
    return (
        <aside className="ded-document-tabs" aria-label="Document tabs">
            <div className="ded-document-tabs__header">
                <span>Document tabs</span>
                <em>{tabs.length}</em>
            </div>

            {tabs.length > 0 ? (
                <div className="ded-document-tabs__list">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            className={`ded-document-tabs__item${activeTabId === tab.id ? ' ded-document-tabs__item--active' : ''}`}
                            style={{
                                '--tab-indent': `${Math.max(0, tab.level - 1) * 10}px`,
                            } as CSSProperties & Record<'--tab-indent', string>}
                            onClick={() => onSelectTab(tab)}
                            title={tab.label}
                            aria-current={activeTabId === tab.id ? 'location' : undefined}
                        >
                            <span>{tab.label}</span>
                            <em>p. {tab.pageNumber}</em>
                        </button>
                    ))}
                </div>
            ) : (
                <p className="ded-document-tabs__empty">
                    Add headings to build document tabs.
                </p>
            )}
        </aside>
    );
}
