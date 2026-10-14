import { create } from 'zustand';

type Toast = { id: string; message: string; tone?: 'default' | 'urgent' | 'success' };

type UiState = {
  mobileNavOpen: boolean;
  toasts: Toast[];
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  pushToast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  toasts: [],
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  pushToast: (message, tone = 'default') =>
    set((s) => ({
      toasts: [...s.toasts, { id: crypto.randomUUID(), message, tone }].slice(-3),
    })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
