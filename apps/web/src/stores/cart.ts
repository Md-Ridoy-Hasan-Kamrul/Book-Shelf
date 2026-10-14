import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type CartItem = { id: string; title: string; qty: number };

type CartState = {
  items: CartItem[];
  count: () => number;
  add: (id: string, title?: string) => void;
  addDemo: () => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      add: (id, title = id) =>
        set((s) => {
          const existing = s.items.find((i) => i.id === id);
          if (existing) {
            return {
              items: s.items.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)),
            };
          }
          return { items: [...s.items, { id, title, qty: 1 }] };
        }),
      addDemo: () => get().add('demo-book', 'Demo Book'),
      clear: () => set({ items: [] }),
    }),
    { name: 'bookverse-cart' },
  ),
);
