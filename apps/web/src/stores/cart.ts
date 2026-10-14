import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = { listingId: string; title: string; qty: number };

type CartState = {
  items: CartItem[];
  count: () => number;
  add: (listingId: string, title: string, qty?: number) => void;
  setQty: (listingId: string, qty: number) => void;
  remove: (listingId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      add: (listingId, title, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.listingId === listingId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.listingId === listingId ? { ...i, qty: i.qty + qty } : i,
              ),
            };
          }
          return { items: [...s.items, { listingId, title, qty }] };
        }),
      setQty: (listingId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.listingId !== listingId)
              : s.items.map((i) => (i.listingId === listingId ? { ...i, qty } : i)),
        })),
      remove: (listingId) =>
        set((s) => ({ items: s.items.filter((i) => i.listingId !== listingId) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'bookverse-cart-v2' },
  ),
);
