import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  icon?: string;
  desc?: string;
  children: ReactNode;
  className?: string;
  /** Tailwind classes for the icon chip (bg + text). Defaults to slate. */
  accent?: string;
};

/**
 * Elevated white card used as the building block for every settings group.
 * Sits on the modal's soft-gray canvas so groups read as distinct surfaces.
 */
export function SectionCard({ title, icon, desc, children, className, accent }: SectionCardProps) {
  return (
    <section className={"rounded-2xl bg-surface-1 ring-1 ring-line shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] p-4 md:p-5 " + (className ?? "")}>
      {title && (
        <header className={"mb-4 flex gap-3 " + (desc ? "items-start" : "items-center")}>
          {icon && (
            <span
              aria-hidden="true"
              className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg " + (desc ? "mt-0.5" : "") + " " + (accent ?? "bg-surface-track text-ink-body")}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0 space-y-0.5">
            <h3 className="text-sm font-bold tracking-tight text-ink-1">{title}</h3>
            {desc && <p className="text-[11px] leading-relaxed text-ink-2">{desc}</p>}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}

/**
 * Inline status/toast banner with an icon. Announces politely so screen-reader
 * users hear save/verify/error outcomes.
 */
export function StatusBanner({ status }: { status: { ok: boolean; msg: string } | null }) {
  if (!status) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold ring-1 " +
        (status.ok
          ? "bg-brand-50 text-brand-700 ring-brand-200"
          : "bg-red-50 text-red-600 ring-red-200")
      }
    >
      <span
        aria-hidden="true"
        className={"flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] text-white " + (status.ok ? "bg-brand-500" : "bg-red-500")}
      >
        {status.ok ? "\u2713" : "!"}
      </span>
      <span className="leading-snug">{status.msg}</span>
    </div>
  );
}

/** Small uppercase field label used above inputs/controls inside cards. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-2">
      {children}
    </span>
  );
}
