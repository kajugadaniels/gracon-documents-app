/**
 * EditorUserAvatarMenu
 *
 * User avatar button in the document editor header.
 * Displays the user's profile picture (or initials fallback) and a dropdown
 * showing account links, the user's name, email, and a sign-out action.
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Logout01Icon, Profile02Icon, Settings02Icon } from '@hugeicons/core-free-icons';
import { useSessionUser } from '@/app/(protected)/layout';
import {
    getMainAppProfileUrl,
    getMainAppSettingsUrl,
    logoutFromDocuments,
} from '@/lib/session';
import { UserAvatar } from '@/components/shared/UserAvatar';

/** Avatar dropdown for the document editor header with cross-app account links. */
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

    const fullName = `${user.postNames} ${user.surName}`.trim() || user.email;
    const profileUrl = getMainAppProfileUrl();
    const settingsUrl = getMainAppSettingsUrl();

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
                <div className="ded-avatar-menu__dropdown" role="menu">
                    <div className="ded-avatar-menu__profile">
                        <UserAvatar user={user} size="sm" />
                        <div className="ded-avatar-menu__copy">
                            <p className="ded-avatar-menu__name">{fullName}</p>
                            <p className="ded-avatar-menu__email">{user.email}</p>
                        </div>
                    </div>
                    <a
                        className="ded-avatar-menu__item"
                        href={profileUrl}
                        role="menuitem"
                        onClick={() => setOpen(false)}
                    >
                        <HugeiconsIcon icon={Profile02Icon} size={15} />
                        <span>Profile</span>
                    </a>
                    <a
                        className="ded-avatar-menu__item"
                        href={settingsUrl}
                        role="menuitem"
                        onClick={() => setOpen(false)}
                    >
                        <HugeiconsIcon icon={Settings02Icon} size={15} />
                        <span>Settings</span>
                    </a>
                    <div className="ded-avatar-menu__divider" />
                    <button
                        className="ded-avatar-menu__item ded-avatar-menu__item--danger"
                        onClick={logout}
                        role="menuitem"
                    >
                        <HugeiconsIcon icon={Logout01Icon} size={15} />
                        <span>Sign out</span>
                    </button>
                </div>
            )}
        </div>
    );
}
