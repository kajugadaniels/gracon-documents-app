/**
 * DocumentCommentsPanel
 *
 * Right-side comment drawer for document collaborators. Comments are separate
 * from editor content, so COMMENT-only users can review without write access.
 */
'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
    createDocumentComment,
    listDocumentComments,
    resolveDocumentComment,
    type DocumentComment,
} from '@/api/documents.api';
import { toast } from '@/components/ui';

interface DocumentCommentsPanelProps {
    documentId: string;
    editor: Editor | null;
    canComment: boolean;
    canResolve: boolean;
    open: boolean;
    onClose: () => void;
}

function getErrorMessage(error: unknown, fallback: string) {
    const message = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
}

function formatCommentDate(value: string) {
    return new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getInitials(comment: DocumentComment) {
    const name = comment.author.displayName || comment.author.email;
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || comment.author.email[0].toUpperCase();
}

function getSelectedText(editor: Editor | null) {
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    if (from === to) return '';
    return editor.state.doc
        .textBetween(from, to, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);
}

function mergeCreatedComment(
    comments: DocumentComment[],
    created: DocumentComment,
) {
    if (!created.parentCommentId) {
        return [created, ...comments];
    }

    return comments.map((comment) => {
        if (comment.id !== created.parentCommentId) return comment;
        return {
            ...comment,
            replies: [...comment.replies, created],
        };
    });
}

function replaceComment(
    comments: DocumentComment[],
    updated: DocumentComment,
) {
    return comments.map((comment) => comment.id === updated.id ? updated : comment);
}

function CommentCard({
    comment,
    canComment,
    canResolve,
    busyCommentId,
    replyDraft,
    onReplyChange,
    onReplySubmit,
    onResolve,
}: {
    comment: DocumentComment;
    canComment: boolean;
    canResolve: boolean;
    busyCommentId: string | null;
    replyDraft: string;
    onReplyChange: (value: string) => void;
    onReplySubmit: () => void;
    onResolve: () => void;
}) {
    const isResolved = Boolean(comment.resolvedAt);
    const isBusy = busyCommentId === comment.id;

    return (
        <article className={`doc-comments__card${isResolved ? ' doc-comments__card--resolved' : ''}`}>
            <div className="doc-comments__card-head">
                <div className="doc-comments__avatar" aria-hidden="true">
                    {comment.author.imageUrl
                        ? <img src={comment.author.imageUrl} alt={getInitials(comment)} />
                        : <span>{getInitials(comment)}</span>
                    }
                </div>
                <div className="doc-comments__identity">
                    <p>{comment.author.displayName}</p>
                    <time dateTime={comment.createdAt}>{formatCommentDate(comment.createdAt)}</time>
                </div>
                {isResolved && <span className="doc-comments__status">Resolved</span>}
            </div>

            {comment.anchorText && (
                <blockquote className="doc-comments__anchor">
                    {comment.anchorText}
                </blockquote>
            )}

            <p className="doc-comments__content">{comment.content}</p>

            {comment.replies.length > 0 && (
                <div className="doc-comments__replies">
                    {comment.replies.map((reply) => (
                        <div key={reply.id} className="doc-comments__reply">
                            <div className="doc-comments__reply-meta">
                                <strong>{reply.author.displayName}</strong>
                                <time dateTime={reply.createdAt}>{formatCommentDate(reply.createdAt)}</time>
                            </div>
                            <p>{reply.content}</p>
                        </div>
                    ))}
                </div>
            )}

            {!isResolved && canComment && (
                <div className="doc-comments__reply-form">
                    <input
                        value={replyDraft}
                        onChange={(event) => onReplyChange(event.target.value)}
                        placeholder="Reply..."
                        disabled={Boolean(busyCommentId)}
                        maxLength={4000}
                    />
                    <button
                        type="button"
                        disabled={Boolean(busyCommentId) || !replyDraft.trim()}
                        onClick={onReplySubmit}
                    >
                        Reply
                    </button>
                </div>
            )}

            {!isResolved && canResolve && (
                <button
                    type="button"
                    className="doc-comments__resolve-btn"
                    disabled={Boolean(busyCommentId)}
                    onClick={onResolve}
                >
                    {isBusy ? 'Resolving...' : 'Resolve'}
                </button>
            )}
        </article>
    );
}

/** Renders the document comments drawer. */
export function DocumentCommentsPanel({
    documentId,
    editor,
    canComment,
    canResolve,
    open,
    onClose,
}: DocumentCommentsPanelProps) {
    const [comments, setComments] = useState<DocumentComment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [content, setContent] = useState('');
    const [anchorText, setAnchorText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [busyCommentId, setBusyCommentId] = useState<string | null>(null);
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

    async function loadComments() {
        setLoading(true);
        setError(null);
        try {
            const response = await listDocumentComments(documentId);
            setComments(response.comments);
        } catch (loadError: unknown) {
            setError(getErrorMessage(loadError, 'Unable to load comments.'));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!open) return;
        void loadComments();
    }, [documentId, open]);

    useEffect(() => {
        if (!open) return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    if (!open) return null;

    function captureSelection() {
        const selectedText = getSelectedText(editor);
        if (!selectedText) {
            toast.info('Select text in the document first.');
            return;
        }

        setAnchorText(selectedText);
    }

    async function submitComment() {
        const trimmedContent = content.trim();
        if (!trimmedContent || submitting) return;

        setSubmitting(true);
        try {
            const created = await createDocumentComment(documentId, {
                content: trimmedContent,
                ...(anchorText.trim() ? { anchorText: anchorText.trim() } : {}),
            });
            setComments((current) => mergeCreatedComment(current, created));
            setContent('');
            setAnchorText('');
            toast.success('Comment added.');
        } catch (submitError: unknown) {
            toast.error(getErrorMessage(submitError, 'Unable to add comment.'));
        } finally {
            setSubmitting(false);
        }
    }

    async function submitReply(parentCommentId: string) {
        const draft = replyDrafts[parentCommentId]?.trim() ?? '';
        if (!draft || busyCommentId) return;

        setBusyCommentId(parentCommentId);
        try {
            const created = await createDocumentComment(documentId, {
                content: draft,
                parentCommentId,
            });
            setComments((current) => mergeCreatedComment(current, created));
            setReplyDrafts((current) => ({ ...current, [parentCommentId]: '' }));
        } catch (replyError: unknown) {
            toast.error(getErrorMessage(replyError, 'Unable to add reply.'));
        } finally {
            setBusyCommentId(null);
        }
    }

    async function resolveComment(commentId: string) {
        if (busyCommentId) return;

        setBusyCommentId(commentId);
        try {
            const updated = await resolveDocumentComment(documentId, commentId);
            setComments((current) => replaceComment(current, updated));
            toast.success('Comment resolved.');
        } catch (resolveError: unknown) {
            toast.error(getErrorMessage(resolveError, 'Unable to resolve comment.'));
        } finally {
            setBusyCommentId(null);
        }
    }

    return (
        <aside className="doc-comments" aria-label="Document comments">
            <div className="doc-comments__header">
                <div>
                    <p className="doc-comments__eyebrow">Review</p>
                    <h2>Comments</h2>
                </div>
                <button type="button" className="doc-comments__close" onClick={onClose} aria-label="Close comments">
                    &times;
                </button>
            </div>

            {canComment ? (
                <div className="doc-comments__composer">
                    <textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder="Add a comment..."
                        maxLength={4000}
                        disabled={submitting}
                    />
                    {anchorText && (
                        <div className="doc-comments__selection">
                            <span>{anchorText}</span>
                            <button type="button" onClick={() => setAnchorText('')}>Clear</button>
                        </div>
                    )}
                    <div className="doc-comments__composer-actions">
                        <button type="button" className="doc-comments__ghost-btn" onClick={captureSelection}>
                            Use selection
                        </button>
                        <button
                            type="button"
                            className="doc-comments__primary-btn"
                            disabled={submitting || !content.trim()}
                            onClick={submitComment}
                        >
                            {submitting ? 'Adding...' : 'Comment'}
                        </button>
                    </div>
                </div>
            ) : (
                <p className="doc-comments__notice">
                    You can view comments, but you do not have permission to add them.
                </p>
            )}

            <div className="doc-comments__body">
                {loading && <p className="doc-comments__empty">Loading comments...</p>}
                {error && (
                    <div className="doc-comments__error">
                        <p>{error}</p>
                        <button type="button" onClick={() => void loadComments()}>Try again</button>
                    </div>
                )}
                {!loading && !error && comments.length === 0 && (
                    <p className="doc-comments__empty">
                        No comments yet. Select text and start the review.
                    </p>
                )}
                {!loading && !error && comments.length > 0 && (
                    <div className="doc-comments__list">
                        {comments.map((comment) => (
                            <CommentCard
                                key={comment.id}
                                comment={comment}
                                canComment={canComment}
                                canResolve={canResolve}
                                busyCommentId={busyCommentId}
                                replyDraft={replyDrafts[comment.id] ?? ''}
                                onReplyChange={(value) => setReplyDrafts((current) => ({
                                    ...current,
                                    [comment.id]: value,
                                }))}
                                onReplySubmit={() => void submitReply(comment.id)}
                                onResolve={() => void resolveComment(comment.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}
