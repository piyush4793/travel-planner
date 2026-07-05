import { useId, useState, type ReactNode } from "react";
import type { Trip } from "./types";

function TripSection({ icon, label, count, color, children, defaultOpen = true }: {
  icon: string; label: string; count: number; color: string; children: ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 mb-3 w-full text-left group focus-ring rounded-lg px-1 -mx-1"
        aria-expanded={open}
        aria-controls={contentId}
      >
        <span className={`text-[10px] transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        <span className="text-sm">{icon}</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</span>
        <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">{count}</span>
        <span className="flex-1 h-px bg-slate-200 ml-2" />
      </button>
      <div id={contentId} role="region" aria-label={label}>{open && children}</div>
    </div>
  );
}

export function PaginatedTripSection({ icon, label, count, color, trips, renderCards, pageSize }: {
  icon: string; label: string; count: number; color: string;
  trips: Trip[]; renderCards: (list: Trip[]) => ReactNode; pageSize: number;
}) {
  const [page, setPage] = useState(1);
  const visible = trips.slice(0, page * pageSize);
  const hasMore = visible.length < trips.length;

  return (
    <TripSection icon={icon} label={label} count={count} color={color}>
      {renderCards(visible)}
      {hasMore && (
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Show more ({trips.length - visible.length} remaining)
          </button>
        </div>
      )}
    </TripSection>
  );
}
