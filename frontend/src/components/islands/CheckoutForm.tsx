import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCartStore } from '../../stores/cart';
import {
  createAddress,
  fetchAddresses,
  initiatePayment,
  postCheckout,
  postCheckoutQuote,
} from '../../lib/checkoutApi';
import { Button } from '../ui/Button';
import { ErrorState } from '../ui/ErrorState';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import type { checkoutQuoteSchema } from '@bookverse/shared';
import type { z } from 'zod';

type Quote = z.infer<typeof checkoutQuoteSchema>;
type AddressRow = {
  id: string;
  label: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  line1: string;
  isDefault: boolean;
};

export default function CheckoutForm() {
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const cartLines = useMemo(
    () => items.map((i) => ({ listingId: i.listingId, qty: i.qty })),
    [items],
  );

  const [addresses, setAddresses] = useState<AddressRow[] | null>(null);
  const [addressId, setAddressId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const [newAddr, setNewAddr] = useState({
    label: 'Home',
    phone: '',
    division: 'Dhaka',
    district: 'Dhaka',
    area: '',
    line1: '',
  });

  const loadAddresses = useCallback(async () => {
    const rows = await fetchAddresses();
    if (rows === null) {
      window.location.href = `/login?redirect=${encodeURIComponent('/checkout')}`;
      return;
    }
    setAddresses(rows);
    if (rows[0] && !addressId) setAddressId(rows[0].id);
  }, [addressId]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const refreshQuote = useCallback(async () => {
    if (cartLines.length === 0) return;
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const q = await postCheckoutQuote({
        items: cartLines,
        addressId: addressId || undefined,
        couponCode: couponCode || undefined,
      });
      setQuote(q);
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : 'Quote failed');
    } finally {
      setQuoteLoading(false);
    }
  }, [addressId, cartLines, couponCode]);

  useEffect(() => {
    const t = setTimeout(() => void refreshQuote(), 300);
    return () => clearTimeout(t);
  }, [refreshQuote]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addressId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const key =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idem-${Date.now()}`;
      const result = await postCheckout(
        {
          items: cartLines,
          addressId,
          paymentMethod,
          couponCode: couponCode || undefined,
        },
        key,
      );
      if (paymentMethod === 'ONLINE') {
        const pay = await initiatePayment(result.checkoutId);
        clear();
        window.location.href = pay.gatewayUrl;
        return;
      }
      clear();
      setSuccessOrderId(result.orders[0]?.id ?? null);
    } catch (err) {
      const e = err as Error & { code?: string; errors?: unknown[] };
      if (e.code === 'COD_UNAVAILABLE') {
        setSubmitError(`${e.message}: অনলাইন পেমেন্ট বেছে নিন।`);
      } else {
        setSubmitError(e.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (successOrderId) {
    return (
      <div className="rounded-[var(--radius-card)] border border-leaf-100 bg-leaf-50 p-6">
        <h2 className="mt-0 text-lg font-bold text-leaf-700">অর্ডার হয়েছে</h2>
        <p className="text-ink-700">
          <a href={`/orders/${successOrderId}`} className="font-semibold text-brand-700">
            অর্ডার দেখুন
          </a>
        </p>
      </div>
    );
  }

  if (cartLines.length === 0) {
    return <p className="text-ink-500">কার্ট খালি।</p>;
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Delivery address</h2>
          {addresses === null ? (
            <Skeleton className="mt-2 h-24 w-full" />
          ) : (
            <ul className="mt-2 list-none space-y-2 p-0">
              {addresses.map((a) => (
                <li key={a.id}>
                  <label className="flex cursor-pointer gap-2 rounded-[var(--radius-card)] border border-line p-3">
                    <input
                      type="radio"
                      name="address"
                      checked={addressId === a.id}
                      onChange={() => setAddressId(a.id)}
                    />
                    <span>
                      <strong>{a.label}</strong>: {a.line1}, {a.area}, {a.district}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Input
              label="Phone"
              value={newAddr.phone}
              onChange={(e) => setNewAddr((s) => ({ ...s, phone: e.target.value }))}
            />
            <Input
              label="Area"
              value={newAddr.area}
              onChange={(e) => setNewAddr((s) => ({ ...s, area: e.target.value }))}
            />
            <Input
              label="Address line"
              className="sm:col-span-2"
              value={newAddr.line1}
              onChange={(e) => setNewAddr((s) => ({ ...s, line1: e.target.value }))}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                const created = await createAddress({ ...newAddr, isDefault: true });
                setAddresses((prev) => [created, ...(prev ?? [])]);
                setAddressId(created.id);
              }}
            >
              Save address
            </Button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-ink-900">Payment</h2>
          <label className="mt-2 flex items-center gap-2">
            <input
              type="radio"
              checked={paymentMethod === 'COD'}
              onChange={() => setPaymentMethod('COD')}
            />
            Cash on delivery (COD)
          </label>
          <label className="mt-2 flex items-center gap-2">
            <input
              type="radio"
              checked={paymentMethod === 'ONLINE'}
              onChange={() => setPaymentMethod('ONLINE')}
            />
            Online (mock / SSLCommerz sandbox)
          </label>
        </div>

        <Input
          label="Coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
        />
      </section>

      <aside className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-4 shadow-sm">
        <h2 className="mt-0 text-lg font-bold">Summary</h2>
        {quoteLoading && !quote ? (
          <Skeleton className="h-32 w-full" />
        ) : quoteError ? (
          <ErrorState message={quoteError} onRetry={() => void refreshQuote()} />
        ) : quote ? (
          <>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="m-0 text-right font-semibold">৳{quote.subtotal}</dd>
              <dt className="text-ink-500">Shipping</dt>
              <dd className="m-0 text-right font-semibold">৳{quote.shippingTotal}</dd>
              <dt className="text-ink-500">Discount</dt>
              <dd className="m-0 text-right font-semibold">−৳{quote.discountTotal}</dd>
              <dt className="font-bold text-ink-900">Total</dt>
              <dd className="m-0 text-right text-lg font-bold text-ink-900">৳{quote.total}</dd>
            </dl>
            {quote.issues.length > 0 && (
              <ul className="mt-3 text-sm text-urgent-600">
                {quote.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
          </>
        ) : null}
        {submitError && <p className="mt-3 text-sm text-urgent-600">{submitError}</p>}
        <Button
          type="submit"
          variant="cta"
          className="mt-4 w-full"
          disabled={submitting || quoteLoading || !quote || quote.issues.length > 0}
        >
          {submitting ? 'Placing order…' : 'Place COD order'}
        </Button>
      </aside>
    </form>
  );
}
