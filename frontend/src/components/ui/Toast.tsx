import { useUiStore } from '../../stores/ui';

export function ToastStack() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex w-[min(100%-2rem,24rem)] -translate-x-1/2 flex-col gap-2 min-[1020px]:bottom-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`rounded-[var(--radius-card)] border border-line px-4 py-3 text-sm font-semibold shadow-[var(--shadow-warm)] ${
            t.tone === 'urgent'
              ? 'bg-urgent-50 text-urgent-600'
              : t.tone === 'success'
                ? 'bg-leaf-50 text-leaf-700'
                : 'bg-paper text-ink-900'
          }`}
        >
          <button type="button" className="w-full text-left" onClick={() => dismiss(t.id)}>
            {t.message}
          </button>
        </div>
      ))}
    </div>
  );
}
