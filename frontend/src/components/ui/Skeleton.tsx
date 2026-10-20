export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-(--radius-card) bg-sand ${className}`} aria-hidden />
  );
}
