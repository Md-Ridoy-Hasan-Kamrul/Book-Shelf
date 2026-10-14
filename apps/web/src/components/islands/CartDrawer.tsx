import { useCartStore } from '../../stores/cart';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CartDrawer({ open, onClose }: Props) {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);

  return (
    <Drawer open={open} onClose={onClose} title="Your cart">
      {items.length === 0 ? (
        <p className="text-ink-500">কার্ট খালি — বই যোগ করুন।</p>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {items.map((item) => (
            <li
              key={item.listingId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-line bg-paper p-3"
            >
              <div>
                <p className="m-0 font-semibold text-ink-900">{item.title}</p>
                <p className="m-0 text-sm text-ink-500">Qty {item.qty}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setQty(item.listingId, item.qty - 1)}
                >
                  −
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setQty(item.listingId, item.qty + 1)}
                >
                  +
                </Button>
                <Button type="button" variant="ghost" onClick={() => remove(item.listingId)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-col gap-2">
        <a
          href="/checkout"
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-card)] bg-cta-500 px-4 text-center font-semibold text-ink-900 no-underline"
          onClick={onClose}
        >
          Checkout
        </a>
      </div>
    </Drawer>
  );
}
