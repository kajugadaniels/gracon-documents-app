import { create } from 'zustand';

interface SidebarState {
    collapsed: boolean;
    mobileOpen: boolean;
    toggle: () => void;
    setCollapsed: (v: boolean) => void;
    openMobile: () => void;
    closeMobile: () => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
    collapsed: false,
    mobileOpen: false,
    toggle: () => { const n = !get().collapsed; localStorage.setItem('doc_sidebar', String(n)); set({ collapsed: n }); },
    setCollapsed: (v) => { localStorage.setItem('doc_sidebar', String(v)); set({ collapsed: v }); },
    openMobile: () => set({ mobileOpen: true }),
    closeMobile: () => set({ mobileOpen: false }),
}));

export function hydrateSidebar() {
    const v = typeof window !== 'undefined' && localStorage.getItem('doc_sidebar') === 'true';
    useSidebarStore.getState().setCollapsed(v);
}