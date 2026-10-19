import { useState } from 'react';
import { z } from 'zod';
import { useCartStore } from '../../stores/cart';
import { apiFetch } from '../../lib/apiClient';
import { Button } from '../ui/Button';

type Props = {
  listingId: string;
  title: string;
  disabled?: boolean;
};

export default function AddToCartButton({ listingId, title, disabled }: Props) {
  const add = useCartStore((s) => s.add);
  const [done, setDone] = useState(false);

  return (
    <Button
      type="button"
      variant="cta"
      disabled={disabled || done}
      onClick={() => {
        add(listingId, title);
        setDone(true);
        try {
          const trackingId = sessionStorage.getItem('bv_tracking');
          if (trackingId) {
            void apiFetch(
              '/publisher/track',
              z.object({ id: z.string(), kind: z.string(), campaignId: z.string() }),
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trackingId, kind: 'ADD_TO_CART' }),
              },
            ).catch(() => undefined);
          }
        } catch {
          /* ignore */
        }
      }}
    >
      {done ? 'Added' : 'Add to cart'}
    </Button>
  );
}
