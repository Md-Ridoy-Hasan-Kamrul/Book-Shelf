import { useState } from 'react';
import { useCartStore } from '../../stores/cart';
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
      }}
    >
      {done ? 'Added' : 'Add to cart'}
    </Button>
  );
}
