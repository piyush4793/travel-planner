import { type TransportType, TRANSPORT_EMOJI } from "../../../core/utils/transport";
import type { DayEntry } from "../../../core/utils/tripPlans";
import type { CityStop } from "./engine";

type Props = {
  stop: CityStop;
  day: DayEntry;
  /** 0-based index of the stop within the route. */
  stopIndex: number;
  stopCount: number;
  /** 0-based index of the day within the stop. */
  dayIndex: number;
  /** Number of activities revealed so far (drives the staggered reveal). */
  visibleActs: number;
};

/**
 * The city-phase itinerary card (stop/day heading, next-transport hint,
 * progressively-revealed activities and hotels). Extracted from
 * ItineraryCinematic as a pure presentational unit so the day-panel content is
 * unit-testable without the WebGL map shell.
 */
export default function CinematicDayPanel({ stop, day, stopIndex, stopCount, dayIndex, visibleActs }: Props) {
  const transport = stop.transportToNext as { type: TransportType; label: string } | undefined;
  return (
    <div key={`${stopIndex}-${dayIndex}`} className="itinerary-card">
      {/* City + stop info */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] font-bold text-brand-400 uppercase tracking-widest">
          Stop {stopIndex + 1} of {stopCount}
        </span>
        {stop.days.length > 1 && (
          <span className="text-[9px] text-stone-500">
            · Day {dayIndex + 1}/{stop.days.length}
          </span>
        )}
      </div>

      <h3 className="text-2xl font-black leading-tight">{stop.name}</h3>
      <div className="flex items-center gap-2 flex-wrap mt-1 mb-4">
        <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">
          {day.label.split("—")[0].trim()}
        </p>
        {day.theme && (
          <span className="text-[9px] font-semibold text-brand-300 bg-brand-950 px-2 py-0.5 rounded-full">
            {day.theme}
          </span>
        )}
      </div>

      {/* Next transport hint */}
      {transport && (
        <p className="text-[10px] text-stone-500 mb-3">
          {TRANSPORT_EMOJI[transport.type]} Next: {transport.label}
        </p>
      )}

      {/* Activities */}
      <ul className="space-y-3">
        {day.activities.slice(0, visibleActs).map((a, ai) => {
          const [main, ...rest] = a.split(" (");
          const detail = rest.join(" (");
          return (
            <li key={ai} className="itinerary-day flex gap-2 leading-snug" style={{ animationDelay: "0ms" }}>
              <span className="text-brand-400 shrink-0 mt-0.5 text-sm">›</span>
              <span className="text-xs text-stone-300">
                {main}
                {detail && <span className="text-stone-400 ml-1">({detail}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Hotels */}
      {visibleActs >= day.activities.length && day.hotels && day.hotels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-white/10 itinerary-day" style={{ animationDelay: "0ms" }}>
          {day.hotels.map((h) => (
            <span key={h} className="text-[10px] text-stone-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
              🏨 {h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
