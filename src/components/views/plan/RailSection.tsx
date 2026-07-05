import { useId, useState, type ReactNode } from "react";

type Props = {
  title: string;
  /** Short muted subtitle shown beside the title. */
  hint?: string;
  /** Optional count badge (e.g. number of options). */
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Luxury emerald collapsible section used by both Plan-workspace rails. Uses the
 * CSS-grid collapse pattern (content stays in the DOM, only its row track
 * animates) so screen readers and tests can still reach the content, and
 * `prefers-reduced-motion` is honoured via `motion-safe:`.
 */
export default function RailSection({ title, hint, count, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e4dece] bg-white/85 shadow-[0_1px_3px_rgba(20,40,30,0.05)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="focus-ring-emerald flex min-h-[44px] w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-[#f4f1e8]/60"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">{title}</span>
        {count != null && (
          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{count}</span>
        )}
        {hint && <span className="truncate text-[10px] font-semibold text-[#a8a293]">· {hint}</span>}
        <span
          aria-hidden="true"
          className={`ml-auto text-[10px] text-[#a8a293] motion-safe:transition-transform motion-safe:duration-200 ${open ? "rotate-90" : ""}`}
        >
          ▸
        </span>
      </button>

      <div className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div id={bodyId} className="px-3.5 pb-3.5 pt-0.5">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
