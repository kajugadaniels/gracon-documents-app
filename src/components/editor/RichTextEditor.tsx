'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import { useEffect, useCallback, useRef } from 'react';

interface RichTextEditorProps {
    initialContent?: Record<string, unknown> | null;
    onContentChange?: (content: Record<string, unknown>, wordCount: number) => void;
    readOnly?: boolean;
    placeholder?: string;
}

export function RichTextEditor({
    initialContent,
    onContentChange,
    readOnly = false,
    placeholder = 'Start writing your document…',
}: RichTextEditorProps) {
    const onChangeRef = useRef(onContentChange);
    onChangeRef.current = onContentChange;

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                codeBlock: { languageClassPrefix: 'language-' },
            }),
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            Highlight.configure({ multicolor: false }),
            Placeholder.configure({ placeholder }),
            CharacterCount,
        ],
        content: initialContent ?? { type: 'doc', content: [{ type: 'paragraph' }] },
        editable: !readOnly,
        onUpdate: ({ editor: e }) => {
            const json = e.getJSON();
            const wordCount = e.storage.characterCount.words() as number;
            onChangeRef.current?.(json as Record<string, unknown>, wordCount);
        },
    });

    // Update content when initialContent changes (e.g. version restore)
    useEffect(() => {
        if (editor && initialContent && !readOnly) {
            const current = JSON.stringify(editor.getJSON());
            const next = JSON.stringify(initialContent);
            if (current !== next) editor.commands.setContent(initialContent);
        }
    }, [editor, initialContent, readOnly]);

    if (!editor) return null;

    return (
        <div className="tiptap-editor">
            {!readOnly && <EditorToolbar editor={editor} />}
            <EditorContent editor={editor} />
        </div>
    );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

import type { Editor } from '@tiptap/react';

function ToolbarButton({
    onClick, active, disabled, title, children,
}: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            style={{
                width: 30, height: 30,
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${active ? 'var(--color-border-primary)' : 'transparent'}`,
                background: active ? 'var(--color-primary-subtle)' : 'transparent',
                color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 100ms ease',
            }}
            onMouseEnter={e => { if (!active && !disabled) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(91,35,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)'; } }}
            onMouseLeave={e => { if (!active && !disabled) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'; } }}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px', flexShrink: 0 }} />;
}

function EditorToolbar({ editor }: { editor: Editor }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            padding: '8px 12px',
            borderBottom: '1px solid var(--editor-toolbar-border)',
            background: 'var(--editor-toolbar-bg)',
            backdropFilter: 'blur(12px)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
        }}>
            {/* History */}
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo" disabled={!editor.can().undo()}>↩</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo" disabled={!editor.can().redo()}>↪</ToolbarButton>

            <Divider />

            {/* Headings */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">H1</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">H2</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">H3</ToolbarButton>

            <Divider />

            {/* Inline formatting */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><strong>B</strong></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><em>I</em></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><u>U</u></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><s>S</s></ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">🖊</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">{`</>`}</ToolbarButton>

            <Divider />

            {/* Alignment */}
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">⬅</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center">↔</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">➡</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">☰</ToolbarButton>

            <Divider />

            {/* Lists */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">• —</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">1.</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">❝</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">{'{}'}</ToolbarButton>

            <Divider />

            {/* Table */}
            <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">⊞</ToolbarButton>
            {editor.isActive('table') && (
                <>
                    <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add column">+col</ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row">+row</ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Delete table">✕⊞</ToolbarButton>
                </>
            )}

            <Divider />

            {/* Horizontal rule */}
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">—</ToolbarButton>
        </div>
    );
}
