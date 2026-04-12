/**
 * MenuDropdown
 *
 * A single top-level menu trigger and its dropdown panel for the document
 * editor menu bar. Renders action items, visual dividers, and nested submenus.
 * Closes on outside click and dispatches the selected action ID to the parent.
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import type { MenuItem } from '@/constants';

interface MenuDropdownProps {
    label: string;
    items: readonly MenuItem[];
    onAction: (actionId: string) => void;
}

/** Renders a top-level menu label with a dropdown of items and optional submenus. */
export function MenuDropdown({ label, items, onAction }: MenuDropdownProps) {
    const [open, setOpen] = useState(false);
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) {
                setOpen(false);
                setOpenSubmenu(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="ded-menu">
            <button
                className={`ded-menu__trigger${open ? ' ded-menu__trigger--open' : ''}`}
                onClick={() => {
                    setOpen((v) => {
                        if (v) setOpenSubmenu(null);
                        return !v;
                    });
                }}
            >
                {label}
            </button>
            {open && (
                <div className="ded-menu__dropdown">
                    {items.map((item, i) => {
                        if (item.type === 'divider') {
                            return <div key={i} className="ded-menu__divider" />;
                        }
                        if (item.type === 'submenu') {
                            return (
                                <div
                                    key={`${item.label}-${i}`}
                                    className="ded-menu__submenu"
                                    onMouseEnter={() => !item.disabled && setOpenSubmenu(item.label)}
                                    onMouseLeave={() => {
                                        setOpenSubmenu((cur) => cur === item.label ? null : cur);
                                    }}
                                >
                                    <button
                                        disabled={item.disabled}
                                        className="ded-menu__item ded-menu__item--submenu"
                                        onMouseEnter={() => !item.disabled && setOpenSubmenu(item.label)}
                                        onFocus={() => !item.disabled && setOpenSubmenu(item.label)}
                                        aria-haspopup="menu"
                                        aria-expanded={openSubmenu === item.label}
                                    >
                                        <span>{item.label}</span>
                                        <span className="ded-menu__submenu-caret" aria-hidden="true">›</span>
                                    </button>
                                    {openSubmenu === item.label && (
                                        <div className="ded-menu__dropdown ded-menu__dropdown--submenu">
                                            {item.items.map((sub) => (
                                                <button
                                                    key={sub.actionId}
                                                    disabled={sub.disabled}
                                                    className="ded-menu__item"
                                                    onClick={() => {
                                                        onAction(sub.actionId);
                                                        setOpen(false);
                                                        setOpenSubmenu(null);
                                                    }}
                                                >
                                                    <span>{sub.label}</span>
                                                    {sub.shortcut && (
                                                        <span className="ded-menu__shortcut">{sub.shortcut}</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return (
                            <button
                                key={item.actionId}
                                disabled={item.disabled}
                                className="ded-menu__item"
                                onClick={() => {
                                    onAction(item.actionId);
                                    setOpen(false);
                                    setOpenSubmenu(null);
                                }}
                            >
                                <span>{item.label}</span>
                                {item.shortcut && (
                                    <span className="ded-menu__shortcut">{item.shortcut}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
