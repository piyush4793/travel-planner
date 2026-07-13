import { createPortal } from "react-dom";
import type { CityStop } from "./engine";

type Props = {
  title: string;
  stops: CityStop[];
  onClose: () => void;
};

/**
 * Reduced-motion fallback for the cinematic fly-through: a static, scrollable
 * route summary rendered in a portal. Extracted from ItineraryCinematic so the
 * (WebGL-free) fallback is directly unit-testable and the shell stays focused on
 * the imperative map engine.
 */
export default function CinematicOverview({ title, stops, onClose }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-surface-1 dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-line dark:border-stone-700 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-1 dark:text-white">🎬 {title} — Itinerary Overview</h2>
          <button onClick={onClose} className="text-ink-3 hover:text-ink-2 dark:hover:text-white text-xl leading-none focus-ring rounded p-1" aria-label="Close">✕</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-ink-2 dark:text-stone-400">Animated fly-through disabled (reduced-motion preference). Here's your route:</p>
          {stops.map((stop, i) => (
            <div key={stop.name} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-300">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink-1 dark:text-white">{stop.name}</div>
                <div className="text-xs text-ink-2 dark:text-stone-400">{stop.days.length} day{stop.days.length > 1 ? "s" : ""}</div>
                {stop.transportToNext && (
                  <div className="text-[10px] text-ink-3 mt-1">→ {stop.transportToNext.label}</div>
                )}
              </div>
            </div>
          ))}
          {stops.length === 0 && (
            <p className="text-xs text-ink-3 text-center py-4">No city route data available for this plan.</p>
          )}
        </div>
        <div className="p-4 border-t border-line dark:border-stone-700 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-xs font-semibold bg-brand-700 text-white rounded-lg hover:bg-brand-800 focus-ring">Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
