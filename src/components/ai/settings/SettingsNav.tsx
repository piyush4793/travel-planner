import { useRef } from "react";

export type SettingsNavItem<K extends string> = { key: K; icon: string; label: string };

type Props<K extends string> = {
  items: SettingsNavItem<K>[];
  active: K;
  onSelect: (key: K) => void;
};

/**
 * Responsive settings navigation: a vertical rail on desktop, a horizontally
 * scrollable strip on mobile. Implements the WAI-ARIA tablist pattern with
 * roving tabindex + arrow-key navigation (both orientations).
 */
export default function SettingsNav<K extends string>({ items, active, onSelect }: Props<K>) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); next = (idx + 1) % items.length; }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); next = (idx - 1 + items.length) % items.length; }
    else return;
    onSelect(items[next].key);
    btnRefs.current[next]?.focus();
  }

  return (
    <nav
      role="tablist"
      aria-label="Settings sections"
      aria-orientation="vertical"
      className="flex flex-row md:flex-col gap-1 shrink-0 overflow-x-auto md:overflow-visible md:w-44 md:pr-4 pb-2 md:pb-0"
    >
      {items.map((item, i) => {
        const selected = item.key === active;
        return (
          <button
            key={item.key}
            ref={(el) => { btnRefs.current[i] = el; }}
            role="tab"
            aria-selected={selected}
            aria-controls={`settings-panel-${item.key}`}
            id={`settings-tab-${item.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(item.key)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={
              "flex items-center gap-2 shrink-0 whitespace-nowrap px-3 py-2 min-h-[36px] rounded-xl text-xs font-semibold transition-[background-color,color,box-shadow] focus-ring " +
              (selected
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/70"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/60")
            }
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
