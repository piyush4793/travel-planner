import { useId, useState, type ReactNode } from "react";

/**
 * Presentation of the section chrome:
 * - `card` (default): a standalone bordered/shadowed white card — used by the
 *   desktop reference rail where each section is a discrete panel.
 * - `flat`: no border/shadow/rounded chrome — used inside a bottom-sheet, where
 *   the parent already supplies the surface. Sections stack as flat accordion
 *   rows divided by the parent's hairlines, matching the Adjust/Filters sheets.
 */
export type RailSectionVariant = "card" | "flat";

type Props = {
  title: string;
  /** Short muted subtitle shown beside the title. */
  hint?: string;
  /** Optional count badge (e.g. number of options). */
  count?: number;
  defaultOpen?: boolean;
  /** Chrome style — `card` for the desktop rail, `flat` for in-sheet. */
  variant?: RailSectionVariant;
  children: ReactNode;
};

/**
 * Luxury emerald collapsible section used by both Plan-workspace rails. Uses the
 * CSS-grid collapse pattern (content stays in the DOM, only its row track
 * animates) so screen readers and tests can still reach the content, and
 * `prefers-reduced-motion` is honoured via `motion-safe:`. One primitive, two
 * presentations (`card` / `flat`) so the desktop rail and the mobile sheet share
 * behaviour without forking the component.
 */
export default function RailSection({ title, hint, count, defaultOpen = false, variant = "card", children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const flat = variant === "flat";

  return (
    <section
      className={
        flat
          ? "overflow-hidden"
          : "overflow-hidden rounded-2xl border border-line bg-surface-1 shadow-[0_1px_3px_rgba(20,40,30,0.05)]"
      }
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={bodyId}
        className={`focus-ring-emerald flex min-h-[44px] w-full items-center gap-2 text-left transition-colors hover:bg-surface-2/60 ${
          flat ? "px-0.5 py-3" : "px-3.5 py-2.5"
        }`}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-800">{title}</span>
        {count != null && (
          <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">{count}</span>
        )}
        {hint && <span className="truncate text-[10px] font-semibold text-ink-4">· {hint}</span>}
        <span
          aria-hidden="true"
          className={`ml-auto text-[10px] text-ink-4 motion-safe:transition-transform motion-safe:duration-200 ${open ? "rotate-90" : ""}`}
        >
          ▸
        </span>
      </button>

      <div className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div id={bodyId} className={flat ? "px-0.5 pb-3.5 pt-0.5" : "px-3.5 pb-3.5 pt-0.5"}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
