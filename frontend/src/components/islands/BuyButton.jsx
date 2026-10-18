import { useState } from 'react';
import { useCartStore } from '../../stores/cart';

export default function BuyButton({ id }) {
  const [added, setAdded] = useState(false);
  const add = useCartStore((s) => s.add);

  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-leaf-700 px-5 text-sm font-semibold text-paper transition hover:bg-leaf-600 disabled:opacity-70"
      onClick={() => {
        add(id);
        setAdded(true);
      }}
      disabled={added}
    >
      {added ? 'Added' : 'Buy'} · {id}
    </button>
  );
}
