import { useState } from 'react';
import { Button } from './Button';

export function SpoilerBlur({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <p className={revealed ? 'text-ink-700' : 'spoiler-blur text-ink-700'}>{text}</p>
      {!revealed ? (
        <Button variant="ghost" className="mt-3" onClick={() => setRevealed(true)}>
          Spoiler দেখুন
        </Button>
      ) : null}
    </div>
  );
}
