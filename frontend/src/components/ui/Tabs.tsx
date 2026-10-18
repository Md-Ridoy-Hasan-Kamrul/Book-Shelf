import { useId, useState, type ReactNode } from 'react';

export type TabItem = { id: string; label: string; panel: ReactNode };

export function Tabs({ items }: { items: TabItem[] }) {
  const baseId = useId().replace(/:/g, '');
  const [active, setActive] = useState(items[0]?.id ?? '');

  return (
    <div>
      <div
        role="tablist"
        aria-label="Sections"
        className="flex flex-wrap gap-2 border-b border-line pb-2"
      >
        {items.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`${baseId}-panel-${tab.id}`}
            className={`rounded-full px-3 py-2 text-sm font-semibold ${active === tab.id ? 'bg-brand-600 text-paper' : 'text-ink-700 hover:bg-sand'}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {items.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={active !== tab.id}
          className="pt-4"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
