import { BRAND } from "../../../core/theme/palette";

type Props = {
  /** Whether the city card is revealed (fades in after arrival). */
  show: boolean;
  /** De-duplicated, non-broken photo URLs for the active stop. */
  photos: string[];
  /** Current slideshow index (mod'd against photo count). */
  slideIdx: number;
  stopName: string;
  theme?: string;
  /** Total days at the active stop (drives the day-progress pips). */
  dayCount: number;
  activeDayIdx: number;
  /** Called when a photo fails to load so the shell can prune it. */
  onBrokenImage: (url: string) => void;
};

/**
 * The map-overlay city photo card (slideshow, caption, day-progress pips, slide
 * dots). Pure presentational leaf extracted from ItineraryCinematic — image
 * error handling is delegated up via onBrokenImage so this stays side-effect free.
 */
export default function CinematicPhotoCard({ show, photos, slideIdx, stopName, theme, dayCount, activeDayIdx, onBrokenImage }: Props) {
  const slideCount = Math.max(1, photos.length);
  return (
    <div
      className="absolute rounded-2xl overflow-hidden shadow-2xl"
      style={{
        top: "5%", left: "4%", right: "4%", bottom: "38%",
        opacity: show ? 1 : 0,
        transition: "opacity 0.9s ease",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      {/* Slideshow layers — fade between images */}
      {photos.map((url, i) => (
        <div
          key={url}
          className="absolute inset-0"
          style={{
            opacity: i === slideIdx % slideCount ? 1 : 0,
            transition: "opacity 1.2s ease",
          }}
        >
          <img
            src={url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => onBrokenImage(url)}
          />
        </div>
      ))}

      {/* Fallback gradient when no photos */}
      {photos.length === 0 && (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${BRAND[950]} 0%, ${BRAND[900]} 60%, ${BRAND[950]} 100%)` }}
        />
      )}

      {/* Bottom gradient + caption */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pt-16 pb-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none">
        <p className="text-white font-black text-2xl leading-tight drop-shadow">
          {stopName}
        </p>
        {theme && (
          <p className="text-white/70 text-sm mt-0.5 font-medium drop-shadow">
            {theme}
          </p>
        )}
      </div>

      {/* Day progress indicator (top-left) */}
      {dayCount > 1 && (
        <div className="absolute top-3 left-4 flex gap-1.5 pointer-events-none">
          {Array.from({ length: dayCount }, (_, di) => (
            <div
              key={di}
              className="rounded-full transition-[width,background] duration-500"
              style={{
                width: di === activeDayIdx ? "20px" : "6px",
                height: "6px",
                background: di === activeDayIdx ? "white" : di < activeDayIdx ? BRAND[300] : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
      )}

      {/* Slide dots (top-right) */}
      {photos.length > 1 && (
        <div className="absolute top-3.5 right-4 flex gap-1 pointer-events-none">
          {photos.map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-colors"
              style={{ background: i === slideIdx % photos.length ? "white" : "rgba(255,255,255,0.35)" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
