import { useId, useState } from "react";

export function CollapsibleSection({ label, count, defaultOpen = false, children }: {
  label: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className="rounded-xl bg-surface-2/50 p-3.5">
      <button
        onClick={() => setOpen((state) => !state)}
        aria-expanded={open}
        aria-controls={contentId}
        className="group flex w-full items-center gap-2 text-left focus-ring rounded"
      >
        <span className={`text-xs text-ink-3 motion-safe:transition-transform motion-safe:duration-300 ease-out ${open ? "rotate-90 text-brand-600" : ""}`}>▸</span>
        <span className="flex-1 text-[11px] font-semibold text-ink-2">{label}</span>
        {count !== undefined && (
          <span className="rounded-full bg-surface-1 px-2 py-0.5 text-[10px] font-semibold text-ink-2 ring-1 ring-line">
            {count}
          </span>
        )}
      </button>
      <div id={contentId} role="region" aria-label={label} className={`grid motion-safe:transition-[grid-template-rows,opacity,margin] motion-safe:duration-300 ease-out ${open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className={`border-l pl-3 motion-safe:transition-colors motion-safe:duration-300 ${open ? "border-brand-200" : "border-transparent"}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
