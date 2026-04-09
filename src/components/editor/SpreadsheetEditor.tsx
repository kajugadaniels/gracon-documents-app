'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface CellAddress { row: number; col: number; }

interface SheetData {
    type: 'spreadsheet';
    sheets: SheetTab[];
}

interface SheetTab {
    id: string;
    name: string;
    rows: number;
    cols: number;
    cells: Record<string, string>; // key = "R1C1"
}

const COL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DEFAULT_COL_W = 100;
const ROW_H = 32;
const HEADER_W = 48;

function cellKey(row: number, col: number) { return `R${row}C${col}`; }
function colLabel(col: number) { return COL_LETTERS[col] ?? `C${col}`; }

// Very simple formula evaluation — SUM, AVERAGE, COUNT
function evalFormula(formula: string, cells: Record<string, string>): string {
    try {
        const f = formula.replace(/\s/g, '').toUpperCase();
        const rangeMatch = f.match(/^=(SUM|AVERAGE|COUNT)\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
        if (rangeMatch) {
            const [, fn, start, end] = rangeMatch;
            const startCol = COL_LETTERS.indexOf(start[0]);
            const startRow = parseInt(start.slice(1)) - 1;
            const endCol = COL_LETTERS.indexOf(end[0]);
            const endRow = parseInt(end.slice(1)) - 1;
            const values: number[] = [];
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    const v = parseFloat(cells[cellKey(r, c)] ?? '');
                    if (!isNaN(v)) values.push(v);
                }
            }
            if (fn === 'SUM') return String(values.reduce((a, b) => a + b, 0));
            if (fn === 'AVERAGE') return values.length ? String(values.reduce((a, b) => a + b, 0) / values.length) : '0';
            if (fn === 'COUNT') return String(values.length);
        }
        // Simple arithmetic
        const expr = f.replace(/^=/, '');
        // Only allow safe characters
        if (/^[\d+\-*/.() ]+$/.test(expr)) {
            // eslint-disable-next-line no-new-func
            const result = Function(`"use strict"; return (${expr})`)();
            return String(result);
        }
    } catch { }
    return '#ERR';
}

interface SpreadsheetEditorProps {
    initialContent?: Record<string, unknown> | null;
    onContentChange?: (content: Record<string, unknown>, wordCount: number) => void;
    readOnly?: boolean;
}

export function SpreadsheetEditor({
    initialContent,
    onContentChange,
    readOnly = false,
}: SpreadsheetEditorProps) {
    const parseContent = (c: Record<string, unknown> | null | undefined): SheetData => {
        if (c?.type === 'spreadsheet' && Array.isArray((c as SheetData).sheets)) {
            return c as SheetData;
        }
        return {
            type: 'spreadsheet',
            sheets: [{ id: 'sheet-1', name: 'Sheet 1', rows: 50, cols: 26, cells: {} }],
        };
    };

    const [data, setData] = useState<SheetData>(() => parseContent(initialContent));
    const [activeTab, setActiveTab] = useState(0);
    const [selected, setSelected] = useState<CellAddress>({ row: 0, col: 0 });
    const [editing, setEditing] = useState<CellAddress | null>(null);
    const [editValue, setEditValue] = useState('');
    const [formulaBar, setFormulaBar] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const onChangeRef = useRef(onContentChange);
    onChangeRef.current = onContentChange;

    const sheet = data.sheets[activeTab] ?? data.sheets[0];

    const getCellValue = (cells: Record<string, string>, row: number, col: number) =>
        cells[cellKey(row, col)] ?? '';

    const getDisplayValue = (cells: Record<string, string>, row: number, col: number) => {
        const raw = getCellValue(cells, row, col);
        if (raw.startsWith('=')) return evalFormula(raw, cells);
        return raw;
    };

    // Update formula bar when selection changes
    useEffect(() => {
        setFormulaBar(getCellValue(sheet.cells, selected.row, selected.col));
    }, [selected, sheet.cells]);

    const commitEdit = useCallback((row: number, col: number, value: string) => {
        setData(prev => {
            const next = {
                ...prev, sheets: prev.sheets.map((s, i) => {
                    if (i !== activeTab) return s;
                    const cells = { ...s.cells };
                    if (value === '') delete cells[cellKey(row, col)];
                    else cells[cellKey(row, col)] = value;
                    return { ...s, cells };
                })
            };
            // Count non-empty cells as "words"
            const count = Object.keys(next.sheets[activeTab]?.cells ?? {}).length;
            onChangeRef.current?.(next as Record<string, unknown>, count);
            return next;
        });
        setEditing(null);
    }, [activeTab]);

    function startEdit(row: number, col: number) {
        if (readOnly) return;
        const raw = getCellValue(sheet.cells, row, col);
        setEditing({ row, col });
        setEditValue(raw);
        setTimeout(() => inputRef.current?.focus(), 0);
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (editing) {
            if (e.key === 'Enter') { commitEdit(editing.row, editing.col, editValue); setSelected({ row: editing.row + 1, col: editing.col }); }
            if (e.key === 'Escape') { setEditing(null); }
            if (e.key === 'Tab') { e.preventDefault(); commitEdit(editing.row, editing.col, editValue); setSelected({ row: editing.row, col: Math.min(sheet.cols - 1, editing.col + 1) }); }
            return;
        }
        if (e.key === 'ArrowUp') setSelected(s => ({ ...s, row: Math.max(0, s.row - 1) }));
        if (e.key === 'ArrowDown') setSelected(s => ({ ...s, row: Math.min(sheet.rows - 1, s.row + 1) }));
        if (e.key === 'ArrowLeft') setSelected(s => ({ ...s, col: Math.max(0, s.col - 1) }));
        if (e.key === 'ArrowRight') setSelected(s => ({ ...s, col: Math.min(sheet.cols - 1, s.col + 1) }));
        if (e.key === 'Enter' || e.key === 'F2') startEdit(selected.row, selected.col);
        if (e.key === 'Delete' || e.key === 'Backspace') commitEdit(selected.row, selected.col, '');
    }

    const cellW = DEFAULT_COL_W;

    return (
        <div
            style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', background: 'var(--editor-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--editor-border)' }}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            {/* Formula bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid var(--editor-toolbar-border)', background: 'var(--editor-toolbar-bg)', flexShrink: 0 }}>
                <div style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-primary-subtle)', fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', minWidth: 48, textAlign: 'center' }}>
                    {colLabel(selected.col)}{selected.row + 1}
                </div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>fx</span>
                <input
                    value={formulaBar}
                    onChange={e => {
                        setFormulaBar(e.target.value);
                        if (!readOnly) commitEdit(selected.row, selected.col, e.target.value);
                    }}
                    readOnly={readOnly}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'monospace', fontSize: 13, color: 'var(--color-text-primary)' }}
                    placeholder="Enter value or formula (=SUM(A1:A10))"
                />
            </div>

            {/* Grid */}
            <div className="sheet-grid" style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', userSelect: 'none' }}>
                    {/* Column headers */}
                    <thead>
                        <tr>
                            <th className="sheet-cell header" style={{ width: HEADER_W, minWidth: HEADER_W, height: ROW_H, position: 'sticky', top: 0, left: 0, zIndex: 3 }} />
                            {Array.from({ length: sheet.cols }).map((_, c) => (
                                <th key={c} className="sheet-cell header" style={{ width: cellW, minWidth: cellW, height: ROW_H, fontSize: 12, position: 'sticky', top: 0, zIndex: 2 }}>
                                    {colLabel(c)}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {Array.from({ length: sheet.rows }).map((_, r) => (
                            <tr key={r}>
                                <td className="sheet-cell header" style={{ width: HEADER_W, height: ROW_H, fontSize: 12, textAlign: 'center', position: 'sticky', left: 0, zIndex: 1 }}>
                                    {r + 1}
                                </td>
                                {Array.from({ length: sheet.cols }).map((_, c) => {
                                    const isSelected = selected.row === r && selected.col === c;
                                    const isEditing = editing?.row === r && editing?.col === c;
                                    const display = isEditing ? editValue : getDisplayValue(sheet.cells, r, c);

                                    return (
                                        <td
                                            key={c}
                                            className={`sheet-cell ${isSelected ? 'selected' : ''}`}
                                            style={{ width: cellW, height: ROW_H }}
                                            onClick={() => { setSelected({ row: r, col: c }); }}
                                            onDoubleClick={() => startEdit(r, c)}
                                        >
                                            {isEditing ? (
                                                <input
                                                    ref={inputRef}
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={() => commitEdit(r, c, editValue)}
                                                    style={{ width: '100%', height: '100%', padding: '4px 8px', background: 'rgba(91,35,255,0.04)', border: 'none', outline: 'none', fontFamily: 'monospace', fontSize: 13 }}
                                                />
                                            ) : (
                                                <div style={{ padding: '4px 8px', fontSize: 13, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: display.startsWith('#') ? 'var(--color-error)' : 'var(--color-text-primary)' }}>
                                                    {display}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Sheet tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 12px', borderTop: '1px solid var(--editor-toolbar-border)', background: 'var(--editor-toolbar-bg)', flexShrink: 0 }}>
                {data.sheets.map((s, i) => (
                    <button key={s.id} onClick={() => setActiveTab(i)}
                        style={{ padding: '4px 14px', borderRadius: '6px 6px 0 0', fontSize: 12, fontWeight: activeTab === i ? 600 : 400, border: `1px solid ${activeTab === i ? 'var(--color-border-primary)' : 'transparent'}`, background: activeTab === i ? 'var(--color-primary-subtle)' : 'transparent', color: activeTab === i ? 'var(--color-primary)' : 'var(--color-text-secondary)', cursor: 'pointer' }}
                    >
                        {s.name}
                    </button>
                ))}
            </div>
        </div>
    );
}