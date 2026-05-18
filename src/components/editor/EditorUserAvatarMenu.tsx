/**
 * EditorUserAvatarMenu
 *
 * User avatar button in the document editor header.
 * Displays the user's profile picture (or initials fallback) and a dropdown
 * showing the user's name, email, and a sign-out action.
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Logout01Icon } from '@hugeicons/core-free-icons';
import { useSessionUser } from '@/app/(protected)/layout';
import { logoutFromDocuments } from '@/lib/session';
import { UserAvatar } from '@/components/shared/UserAvatar';

/** Avatar dropdown for the document editor header — shows user info and sign-out. */
export function EditorUserAvatarMenu() {
    const user = useSessionUser();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!user) return null;

    function logout() {
        void logoutFromDocuments();
    }

    return (
        <div ref={ref} className="ded-avatar-menu">
            <button
                className="ded-avatar-btn"
                onClick={() => setOpen((v) => !v)}
                title={`${user.postNames} ${user.surName}`}
                aria-label="Account menu"
            >
                <UserAvatar user={user} size="sm" />
            </button>
            {open && (
                <div className="ded-avatar-menu__dropdown">
                    <div className="ded-avatar-menu__profile">
                        <p className="ded-avatar-menu__name">{user.postNames} {user.surName}</p>
                        <p className="ded-avatar-menu__email">{user.email}</p>
                    </div>
                    <div className="ded-avatar-menu__divider" />
                    <button
                        className="ded-avatar-menu__item ded-avatar-menu__item--danger"
                        onClick={logout}
                    >
                        <HugeiconsIcon icon={Logout01Icon} size={15} />
                        <span>Sign out</span>
                    </button>
                </div>
            )}
        </div>
    );
}
