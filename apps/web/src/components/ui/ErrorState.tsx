import { Button } from './Button';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-urgent-600/30 bg-urgent-50 p-6">
      <p className="m-0 font-semibold text-urgent-600">{message}</p>
      {onRetry ? (
        <Button variant="ghost" className="mt-3" onClick={onRetry}>
          আবার চেষ্টা
        </Button>
      ) : null}
    </div>
  );
}
