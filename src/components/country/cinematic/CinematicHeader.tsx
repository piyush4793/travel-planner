import { TRANSPORT_EMOJI } from "../../../core/utils/transport";
import type { CityStop } from "./engine";

type Props = {
  title: string;
  duration: string;
  isMobile: boolean;
  /** Departure city label; empty for domestic (no-origin) routes. */
  homeCity: string;
  /** Whether an international departure frames the route. */
  showOrigin: boolean;
  stops: CityStop[];
  /** 0-based index of the currently-active stop (drives the trail state). */
  activeCityIdx: number;
  onClose: () => void;
};

/**
 * The cinematic panel header: title + duration, a Close control, and the route
 * progress trail (origin → stops → origin). Pure presentational leaf extracted
 * from ItineraryCinematic for unit-testability.
 */
export default function CinematicHeader({ title, duration, isMobile, homeCity, showOrigin, stops, activeCityIdx, onClose }: Props) {
  return (
    <div className={`${isMobile ? "px-4 pt-0 pb-2" : "px-5 pt-5 pb-4"} border-b border-white/10 shrink-0`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={`${isMobile ? "text-base" : "text-xl"} font-black truncate`}>{title}</h2>
            <span className="text-[10px] text-stone-400 shrink-0">{duration}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Playback controls live once in the persistent footer bar (all screens); the header keeps only Close so there's no duplicate control cluster. */}
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white hover:bg-white/10 w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-sm focus-ring"
            aria-label="Close"
          >✕</button>
        </div>
      </div>

      {/* Route progress trail */}
      <div className="flex items-center gap-1 flex-wrap">
        {showOrigin && (
          <>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide mr-1">{homeCity}</span>
            <span className="text-[10px] text-stone-500">✈</span>
          </>
        )}
        {stops.map((stop, i) => (
          <span key={stop.name} className="flex items-center gap-1">
            <span
              title={stop.name}
              className={`inline-block rounded-full transition-[width,height,background-color,box-shadow] duration-500 ${
                i < activeCityIdx   ? "w-2 h-2 bg-brand-400" :
                i === activeCityIdx ? "w-3 h-3 bg-white ring-2 ring-brand-400 ring-offset-1 ring-offset-stone-950" :
                                     "w-2 h-2 bg-white/15"
              }`}
            />
            {i < stops.length - 1 && stop.transportToNext && (
              <span className="text-[10px] opacity-30">{TRANSPORT_EMOJI[stop.transportToNext.type]}</span>
            )}
          </span>
        ))}
        {showOrigin && (
          <>
            <span className="text-[10px] text-stone-500 ml-0.5">✈</span>
            <span className="text-[10px] font-bold text-stone-400 ml-0.5">{homeCity}</span>
          </>
        )}
      </div>
    </div>
  );
}
