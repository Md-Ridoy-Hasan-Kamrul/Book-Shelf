import { Badge } from './Badge';
import { Price } from './Price';
import { Rating } from './Rating';

type Props = {
  title: string;
  author: string;
  price: number;
  inStock?: boolean;
};

export function BookCard({ title, author, price, inStock = true }: Props) {
  return (
    <article className="rounded-(--radius-card) border border-line bg-paper p-4 shadow-(--shadow-warm)">
      <div className="mb-3 aspect-3/4 rounded-(--radius-card) bg-sand" aria-hidden />
      <h3 className="m-0 font-display text-base font-bold text-ink-900">{title}</h3>
      <p className="m-0 mt-1 text-sm text-ink-500">{author}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Price amount={price} />
        <Rating value={4} />
        {inStock ? <Badge tone="leaf">স্টক আছে</Badge> : <Badge tone="urgent">শেষ</Badge>}
      </div>
    </article>
  );
}
