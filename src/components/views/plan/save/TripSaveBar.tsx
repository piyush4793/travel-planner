type Props = {
  /** true when the route has more than one stop — tunes the accessible copy. */
  isMulti: boolean;
  /** Whether the saved trip is currently favourited. */
  favorite: boolean;
  /** Toggle the saved trip's favourite (acts on the trip snapshot, not countries). */
  onToggleFavorite?: () => void;
};

/**
 * The Plan-journey trip affordance shown in the Review header cluster. The
 * composed trip auto-saves to My Trips the moment Review is reached, so this is
 * NOT a persistent "saved" badge (that confirmation is a transient toast + the
 * one-time reveal — a permanent tick is visual noise). It is a single, refined
 * **Favourite this trip** icon toggle that acts on the saved trip snapshot itself
 * — one consistent meaning of "favourite" across the app — styled to match the
 * header's other circular icon controls so the cluster reads as one quiet family.
 */
export default function TripSaveBar({ isMulti, favorite, onToggleFavorite }: Props) {
  if (!onToggleFavorite) return null;
  const noun = isMulti ? "route" : "trip";
  return (
    <button
      onClick={onToggleFavorite}
      aria-pressed={favorite}
      aria-label={favorite ? `Remove this ${noun} from favorites` : `Favorite this ${noun}`}
      title={favorite ? "Favourited — saved in My Trips \u2605" : "Favourite this trip \u2014 save it to My Trips \u2605"}
      className={`focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base leading-none transition-colors ${
        favorite
          ? "border-amber-300 bg-amber-50 text-amber-500 hover:bg-amber-100"
          : "border-line bg-white text-ink-3 hover:border-amber-200 hover:text-amber-500"
      }`}
    >
      <span aria-hidden="true">{favorite ? "\u2605" : "\u2606"}</span>
    </button>
  );
}
