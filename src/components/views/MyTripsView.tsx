import { useMemo, useState } from "react";
import type { SavedTrip } from "../../core/utils/savedTrips";
import { BUDGET_BASIS_META } from "../../core/utils/budget";
import { getCountryFlag } from "../../utils/countryFlags";
import { useConfirm } from "../shared/ConfirmDialog";

type Props = {
  savedTrips: SavedTrip[];
  onToggleFavorite: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen: (trip: SavedTrip) => void;
  onGoPlan: () => void;
};

/** Human "saved 3 days ago" style label from an ISO timestamp. */
function savedAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Saved today";
  if (days === 1) return "Saved yesterday";
  if (days < 30) return `Saved ${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "Saved a month ago";
  if (months < 12) return `Saved ${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "Saved a year ago" : `Saved ${years} years ago`;
}

function placeCount(trip: SavedTrip): number {
  return trip.stops.reduce((n, s) => n + s.cities.length, 0);
}

/** Case-insensitive match across the trip name, its countries, and its cities. */
function tripMatchesQuery(trip: SavedTrip, q: string): boolean {
  if (!q) return true;
  if (trip.name.toLowerCase().includes(q)) return true;
  return trip.stops.some(
    (s) =>
      s.country.toLowerCase().includes(q) ||
      s.cities.some((city) => city.toLowerCase().includes(q)),
  );
}

function SavedTripCard({
  trip,
  onToggleFavorite,
  onRemove,
  onOpen,
}: {
  trip: SavedTrip;
  onToggleFavorite: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen: (trip: SavedTrip) => void;
}) {
  const basis = BUDGET_BASIS_META[trip.basis];
  const places = placeCount(trip);
  const multi = trip.stops.length > 1;
  return (
    <article className="group relative flex flex-col gap-3 rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      {/* Stretched primary action — opens the trip in the Plan wizard. Secondary
          controls (favorite/delete) sit above it (z-20) so they stay clickable. */}
      <button
        type="button"
        onClick={() => onOpen(trip)}
        aria-label={`Open ${trip.name}`}
        className="focus-ring absolute inset-0 z-10 rounded-2xl"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-lg" aria-hidden="true">
            {trip.stops.map((s) => (
              <span key={s.country}>{getCountryFlag(s.country)}</span>
            ))}
          </div>
          <h3 className="mt-1 truncate text-sm font-semibold text-emerald-950 group-hover:text-emerald-700 sm:text-base" title={trip.name}>
            {trip.name}
          </h3>
          {multi && (
            <p className="mt-0.5 text-[11px] text-emerald-800/70">
              {trip.stops.length}-stop route
            </p>
          )}
        </div>
        <div className="relative z-20 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleFavorite(trip.id)}
            aria-pressed={!!trip.favorite}
            aria-label={trip.favorite ? `Unfavorite ${trip.name}` : `Favorite ${trip.name}`}
            className={`focus-ring flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full text-base transition-colors ${
              trip.favorite ? "text-amber-500" : "text-emerald-900/30 hover:text-amber-400"
            }`}
          >
            {trip.favorite ? "★" : "☆"}
          </button>
          <button
            type="button"
            onClick={() => onRemove(trip.id)}
            aria-label={`Delete ${trip.name}`}
            className="focus-ring flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full text-sm text-emerald-900/40 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            🗑
          </button>
        </div>
      </div>

      {trip.stops.some((s) => s.cities.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {trip.stops.flatMap((s) => s.cities).slice(0, 8).map((city, i) => (
            <span
              key={`${city}-${i}`}
              className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800"
            >
              {city}
            </span>
          ))}
          {places > 8 && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700/70">
              +{places - 8} more
            </span>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-emerald-900/70">
        <span className="font-medium text-emerald-900">
          {trip.totalDays} {trip.totalDays === 1 ? "day" : "days"}
        </span>
        {places > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span>{places} {places === 1 ? "place" : "places"}</span>
          </>
        )}
        {trip.costPerPerson && (
          <>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1" title={basis.long}>
              <span aria-hidden="true">{basis.icon}</span>
              {trip.costPerPerson}
            </span>
          </>
        )}
      </div>

      <p className="text-[10px] uppercase tracking-wide text-emerald-800/40">{savedAgo(trip.savedAt)}</p>
    </article>
  );
}

/**
 * My Trips — a lightweight gallery of the self-contained trip snapshots the
 * traveller saved from the Plan wizard ({@link useSavedTrips}). Favourites float
 * to the top; everything else is newest-first (store order). Each snapshot is
 * independent of My List, so trips stay viewable even after the underlying
 * destinations or rules change.
 */
export default function MyTripsView({ savedTrips, onToggleFavorite, onRemove, onOpen, onGoPlan }: Props) {
  const [confirm, ConfirmDialog] = useConfirm();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const { favorites, rest } = useMemo(() => {
    const matched = q ? savedTrips.filter((t) => tripMatchesQuery(t, q)) : savedTrips;
    const favorites = matched.filter((t) => t.favorite);
    const rest = matched.filter((t) => !t.favorite);
    return { favorites, rest };
  }, [savedTrips, q]);

  const handleRemove = async (trip: SavedTrip) => {
    const ok = await confirm({
      title: "Delete this trip?",
      message: `"${trip.name}" will be removed from My Trips. This can't be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (ok) onRemove(trip.id);
  };

  if (savedTrips.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl" aria-hidden="true">🧳</div>
        <div>
          <h2 className="text-lg font-semibold text-emerald-950">No saved trips yet</h2>
          <p className="mt-1 max-w-sm text-sm text-emerald-800/70">
            Plan a trip and it's saved here automatically — so you can come back to it anytime.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoPlan}
          className="focus-ring min-h-[44px] rounded-full bg-emerald-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          Plan a trip
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-5 sm:px-6">
      <ConfirmDialog />
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-emerald-950 sm:text-2xl">My Trips</h1>
          <p className="mt-0.5 text-sm text-emerald-800/70">
            {savedTrips.length} saved {savedTrips.length === 1 ? "trip" : "trips"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-900/40" aria-hidden="true">🔍</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search trips…"
              aria-label="Search saved trips by name, country, or city"
              className="focus-ring min-h-[40px] w-full rounded-full border border-emerald-900/15 bg-white pl-9 pr-3 text-sm text-emerald-950 placeholder:text-emerald-900/40"
            />
          </div>
          <button
            type="button"
            onClick={onGoPlan}
            className="focus-ring min-h-[40px] shrink-0 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            + New trip
          </button>
        </div>
      </header>

      {favorites.length === 0 && rest.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="text-4xl" aria-hidden="true">🔍</div>
          <p className="text-sm text-emerald-800/70">
            No trips match “{query.trim()}”.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="focus-ring min-h-[36px] rounded-full border border-emerald-900/15 px-4 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
          >
            Clear search
          </button>
        </div>
      ) : (
        <>
          {favorites.length > 0 && (
            <section className="mb-6" aria-labelledby="favorites-heading">
              <h2 id="favorites-heading" className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
                ★ Favorites
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((trip) => (
                  <SavedTripCard
                    key={trip.id}
                    trip={trip}
                    onToggleFavorite={onToggleFavorite}
                    onOpen={onOpen}
                    onRemove={() => handleRemove(trip)}
                  />
                ))}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section aria-labelledby="all-trips-heading">
              {favorites.length > 0 && (
                <h2 id="all-trips-heading" className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800/60">
                  All trips
                </h2>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((trip) => (
                  <SavedTripCard
                    key={trip.id}
                    trip={trip}
                    onToggleFavorite={onToggleFavorite}
                    onOpen={onOpen}
                    onRemove={() => handleRemove(trip)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
      </div>
    </div>
  );
}
