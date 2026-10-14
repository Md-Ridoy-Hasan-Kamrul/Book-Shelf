import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Drawer({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="fixed inset-y-0 right-0 m-0 ml-auto h-full w-[min(100%,20rem)] max-w-full rounded-none border-l border-line bg-paper p-0 text-ink-900 shadow-[var(--shadow-warm)] backdrop:bg-ink-900/40"
      onClose={onClose}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="m-0 font-display text-lg font-bold">{title}</h2>
        <Button
          variant="ghost"
          className="min-h-9 px-2"
          onClick={onClose}
          aria-label="Close drawer"
        >
          ✕
        </Button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}
