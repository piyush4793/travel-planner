type Props = {
  /** true when the route has more than one stop — tunes the copy. */
  isMulti: boolean;
  /** Whether the saved trip is currently favourited. */
  favorite: boolean;
  /** Toggle the saved trip's favourite (acts on the trip snapshot, not countries). */
  onToggleFavorite?: () => void;
};

/**
 * Compact Plan-journey save affordance shown in the Review header cluster. The
 * composed trip is auto-saved to My Trips the moment Review is reached, so this
 * is a lightweight confirmation ("✓ Saved") plus a single, unambiguous
 * **Favourite this trip** toggle that acts on the saved trip snapshot itself —
 * one consistent meaning of "favourite" across the app. Kept inline (not a
 * full-width banner) so it never eats vertical space above the itinerary.
 */
export default function TripSaveBar({ isMulti, favorite, onToggleFavorite }: Props) {
  const noun = isMulti ? "route" : "trip";
  return (
    <div className="flex items-center gap-1.5" role="status" aria-live="polite">
      <span
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"
        title={`Saved to My Trips — reopen this ${noun} anytime from the Trips tab`}
      >
        <span aria-hidden="true">✓</span>
        <span className="hidden sm:inline">Saved</span>
      </span>
      {onToggleFavorite && (
        <button
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? `Remove this ${noun} from favorites` : `Favorite this ${noun}`}
          title={favorite ? "Favorited — in My Trips ★" : "Favorite this trip"}
          className={`focus-ring inline-flex min-h-[32px] shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
            favorite
              ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              : "border-[#e0dac9] bg-white text-emerald-800 hover:bg-[#f4f1e8]"
          }`}
        >
          <span aria-hidden="true">{favorite ? "★" : "☆"}</span>
          <span className="hidden sm:inline">{favorite ? "Favorited" : "Favorite"}</span>
        </button>
      )}
    </div>
  );
}
