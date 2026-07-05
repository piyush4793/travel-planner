import { memo, useEffect, useState } from "react";
import type { Country } from "../../../core/types";
import type { BudgetBasis } from "../../../core/utils/filterLogic";
import { budgetForBasis, BUDGET_BASIS_META } from "../../../core/utils/budget";
import { getWikiImage } from "../../../utils/wikiImages";
import type { Trip } from "./types";

const REGION_ACCENT: Record<string, string> = {
  Asia: "border-l-rose-400",
  Europe: "border-l-blue-400",
  "Middle East": "border-l-amber-400",
  Africa: "border-l-orange-400",
  Americas: "border-l-emerald-400",
  Oceania: "border-l-cyan-400",
};

const REGION_BADGE: Record<string, string> = {
  Asia: "bg-rose-50 text-rose-600",
  Europe: "bg-blue-50 text-blue-600",
  "Middle East": "bg-amber-50 text-amber-600",
  Africa: "bg-orange-50 text-orange-600",
  Americas: "bg-emerald-50 text-emerald-600",
  Oceania: "bg-cyan-50 text-cyan-600",
};

function getSharedExperiences(countries: Country[]): string[] {
  if (countries.length < 2) return [];
  const freq = new Map<string, number>();
  for (const c of countries) {
    for (const e of c.experiences) {
      freq.set(e, (freq.get(e) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([e]) => e);
}

function ImageCollageBase({ queries }: { queries: string[] }) {
  const [images, setImages] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    Promise.allSettled(queries.map((q) => getWikiImage(q))).then((results) => {
      if (cancelled) return;
      const urls = results
        .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((v): v is string => !!v);
      setImages(urls);
      setLoaded(true);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.join(",")]);

  if (!loaded) {
    return (
      <div className="relative h-24 overflow-hidden bg-slate-200 rounded-t-xl">
        <div className="absolute inset-0 shimmer-sweep" />
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <div className="flex h-24 overflow-hidden">
      {images.slice(0, 3).map((url, i) => (
        <div key={i} className="flex-1 relative overflow-hidden">
          <img
            src={url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      ))}
    </div>
  );
}

const ImageCollage = memo(ImageCollageBase);

type TripCardProps = {
  trip: Trip;
  budgetBasis: BudgetBasis;
  visitedNames: Set<string>;
  favorites: Set<string>;
  countryByName: Map<string, Country>;
  onSelect: (c: Country) => void;
  /** Stable per-trip-type handler; receives the trip's main name. */
  onEdit?: (mainName: string) => void;
  compact?: boolean;
};

function TripCardBase({
  trip,
  budgetBasis,
  visitedNames,
  favorites,
  countryByName,
  onSelect,
  onEdit,
  compact,
}: TripCardProps) {
  const isCombo = trip.addOns.length > 0;
  const suggestedPairs = !isCombo && !trip.allVisited ? (trip.main.combo ?? []).slice(0, 2) : [];
  const budgetDisplay = budgetForBasis(trip.main, budgetBasis);
  const budgetBasisMeta = BUDGET_BASIS_META[budgetBasis];
  const progress = trip.allCountries.length > 0
    ? Math.round((trip.visitedCount / trip.allCountries.length) * 100)
    : 0;

  const imageQueries = trip.allCountries.slice(0, 3).map((c) => {
    const anchor = c.landmark ?? c.experiences?.[0] ?? c.cities?.[0]?.name;
    return anchor ? `${anchor} ${c.name}` : `${c.name} travel landmark`;
  });

  const accent = REGION_ACCENT[trip.region] ?? "border-l-slate-300";

  return (
    <article
      className={`relative rounded-xl border border-l-[3px] overflow-hidden transition group cursor-pointer ${accent} ${
        trip.allVisited
          ? "bg-emerald-50/60 border-emerald-200"
          : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {/* Image collage strip */}
      <ImageCollage queries={imageQueries} />

      <div className={compact ? "p-3" : "p-4"}>
      {compact ? (
        /* Compact grid layout — stacked */
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <button
              onClick={() => onSelect(trip.main)}
              aria-label={`Open ${trip.main.name}`}
              className="text-sm font-bold text-gray-800 hover:text-blue-600 transition-colors truncate focus-ring rounded after:absolute after:content-[''] after:inset-0 after:z-[1]"
            >
              {trip.allVisited ? "✅ " : ""}{trip.main.name}
            </button>
           <div className="flex items-center gap-1 shrink-0 ml-1">
             {onEdit && (
               <button
                 onClick={(e) => { e.stopPropagation(); onEdit(trip.main.name); }}
                 className="relative z-[2] text-[11px] text-gray-400 hover:text-blue-600 px-1.5 py-1 rounded hover:bg-blue-50 transition-colors focus-ring"
                 aria-label="Edit trip"
               >
                 ✏️
               </button>
             )}
             <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${REGION_BADGE[trip.region] ?? "bg-gray-50 text-gray-400"}`}>
               {trip.region}
             </span>
             {trip.isCustom && (
               <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-500 border border-violet-100">
                 🏷 Custom
               </span>
             )}
           </div>
          </div>
          {isCombo && (
            <div className="flex min-h-[22px] items-center gap-1 mb-1.5 flex-wrap">
              <span className="text-gray-300 text-[10px]">+</span>
              {trip.addOns.map((c) => (
                <button
                  key={c.name}
                  onClick={(e) => { e.stopPropagation(); onSelect(c); }}
                  className="relative z-[2] text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 px-2 py-0.5 rounded-full transition-colors"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          {!isCombo && (
            <div className="flex min-h-[22px] items-center gap-1 mb-1.5 flex-wrap">
              {suggestedPairs.length > 0 ? (
                <>
                  <span className="text-gray-300 text-[10px]">+</span>
                  {suggestedPairs.map((name) => (
                    <button
                      key={name}
                      onClick={(e) => {
                        e.stopPropagation();
                        const match = countryByName.get(name);
                        if (match) onSelect(match);
                      }}
                      className="relative z-[2] text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </>
              ) : (
                <span className="text-[10px] font-medium text-gray-300 bg-transparent px-2 py-0.5 rounded-full border border-dashed border-gray-200">
                  No combo yet
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-medium">{trip.visitedCount}/{trip.allCountries.length}</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Trip completion">
              <div className={`h-full rounded-full transition-[width,background-color] ${trip.allVisited ? "bg-emerald-400" : "bg-blue-400"}`}
                style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      ) : (
        /* Full list layout */
        <>
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-base shrink-0">
            {trip.allVisited ? "✅" : isCombo ? "🔗" : "📍"}
          </span>
          <button
            onClick={() => onSelect(trip.main)}
            aria-label={`Open ${trip.main.name}`}
            className="text-sm font-bold text-gray-800 hover:text-blue-600 transition-colors truncate focus-ring rounded after:absolute after:content-[''] after:inset-0 after:z-[1]"
          >
            {trip.main.name}
          </button>
          <span className={`shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded ${REGION_BADGE[trip.region] ?? "bg-gray-50 text-gray-400"}`}>
            {trip.region}
          </span>
          {trip.isCustom && (
            <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-500 border border-violet-100">
              🏷 Custom
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(trip.main.name); }}
              className="relative z-[2] md:opacity-0 md:group-hover:opacity-100 text-[11px] text-gray-400 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition"
              aria-label="Edit trip"
            >
              ✏️
            </button>
          )}
          <span className="text-[10px] text-gray-400 font-medium">
            {trip.visitedCount}/{trip.allCountries.length}
          </span>
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Trip completion">
            <div
              className={`h-full rounded-full transition-[width,background-color] ${
                trip.allVisited ? "bg-emerald-400" : "bg-blue-400"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Budget + best months info (list mode only) */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {trip.main.budget && (
            <span
              className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full"
              title={`Budget ${budgetBasisMeta.long}`}
            >
              {budgetBasisMeta.icon} {budgetDisplay}
            </span>
          )}
          {trip.main.bestMonths?.slice(0, 3).map((m) => (
            <span key={m} className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">{m}</span>
          ))}
        </div>
      )}

      {suggestedPairs.length > 0 && !compact && (
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          <span className="text-gray-300 text-xs">+</span>
          {suggestedPairs.map((name) => (
            <button
              key={name}
              onClick={(e) => {
                e.stopPropagation();
                const match = countryByName.get(name);
                if (match) onSelect(match);
              }}
              className="relative z-[2] text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Add-on chips (list mode only) */}
      {!compact && isCombo && trip.addOns.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {trip.addOns.map((c) => {
            const isVisited = visitedNames.has(c.name);
            const isFav = favorites.has(c.name);
            return (
              <button
                key={c.name}
                onClick={(e) => { e.stopPropagation(); onSelect(c); }}
                className={`relative z-[2] inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                  isVisited
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {isVisited
                  ? <span className="text-[10px]">✓</span>
                  : isFav
                    ? <span className="text-yellow-500 text-[10px]">★</span>
                    : null}
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Shared experiences (list mode only) */}
      {isCombo && !compact && (
        <div className="mt-2 flex flex-wrap gap-1">
          {getSharedExperiences(trip.allCountries).slice(0, 4).map((exp) => (
            <span
              key={exp}
              className="text-[9px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded"
            >
              {exp}
            </span>
          ))}
        </div>
      )}
      </>
      )}
      </div>
    </article>
  );
}

/**
 * Memoized so that parent state changes that don't touch a card's props
 * (e.g. typing in the search box) skip re-rendering every card. Trip objects
 * keep identity through filter/sort, and the callbacks + countryByName map are
 * referentially stable from the parent.
 */
const TripCard = memo(TripCardBase);
export default TripCard;
