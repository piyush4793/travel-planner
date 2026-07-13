import type { TripPlan, DayEntry } from "../core/utils/tripPlans";
import { extractPlanCities } from "../core/utils/tripPlans";
import type { Country, DietNotes } from "../core/types";

/**
 * One stop in a (possibly multi-country) itinerary, as the PDF surfaces need it.
 * `dayCount` is how many of the composed plan's days this stop contributes, in
 * visit order — the model slices the flat composed day list back into per-stop
 * sections from these counts. Nothing here assumes "country": the same shape
 * serves a future domestic route of states/cities.
 */
export type PdfRouteStop = {
  name: string;
  dayCount: number;
  /** Per-person cost range for this stop (as displayed elsewhere). */
  cost?: string;
  bestMonths?: string[];
  /** This stop's own free-form practical note (SIM/apps/connections/tips). */
  note?: string;
  /** Optional dietary guidance (veg/vegan) for this stop, when authored. */
  diet?: DietNotes;
};

/** A contiguous, per-stop slice of the itinerary with its day range. */
export type PdfSection = {
  name: string;
  /** 1-based inclusive day numbers within the whole trip. */
  dayStart: number;
  dayEnd: number;
  days: DayEntry[];
  cost?: string;
  bestMonths?: string[];
  /** This stop's own practical note, rendered per-section for multi routes. */
  note?: string;
  /** This stop's dietary guidance, rendered per-section when authored. */
  diet?: DietNotes;
};

/** Normalised, render-ready view of an itinerary for both PDF paths. */
export type PdfModel = {
  /** Route title — a single stop's name, or "A → B → C" for multi. */
  title: string;
  homeCountry: string;
  /** True when the trip spans more than one stop (drives section headers). */
  multi: boolean;
  meta: {
    duration: string;
    costPerPerson: string;
    cityCount: number;
    stopCount: number;
  };
  sections: PdfSection[];
  note: string;
  warning?: string;
};

/**
 * Build the shared, presentation-focused model both PDF renderers consume.
 *
 * Single stop (no `stops`, or one stop) → `multi=false`, one section titled after
 * the country, so the single-destination PDF is unchanged. Multiple stops → the
 * composed plan's continuously-numbered days are sliced back per stop by their
 * `dayCount`, giving each country its own section + day range while the header
 * shows the whole route. Any day-count drift (defensive) folds leftover days into
 * the last section so nothing is ever dropped.
 */
export function buildPdfModel(
  plan: TripPlan,
  country: Country,
  homeCountry: string,
  stops?: PdfRouteStop[],
): PdfModel {
  const total = plan.days.length;
  const norm: PdfRouteStop[] =
    stops && stops.length > 0
      ? stops
      : [{ name: country.name, dayCount: total, cost: plan.costPerPerson, bestMonths: country.bestMonths, diet: country.diet }];

  const multi = norm.length > 1;

  const sections: PdfSection[] = [];
  let offset = 0;
  for (const stop of norm) {
    const count = Math.max(0, Math.min(stop.dayCount, total - offset));
    sections.push({
      name: stop.name,
      dayStart: offset + 1,
      dayEnd: offset + count,
      days: plan.days.slice(offset, offset + count),
      cost: stop.cost,
      bestMonths: stop.bestMonths,
      note: stop.note,
      diet: stop.diet,
    });
    offset += count;
  }
  // Fold any remaining days (count drift) into the last section so none are lost.
  if (offset < total && sections.length > 0) {
    const last = sections[sections.length - 1];
    last.days = last.days.concat(plan.days.slice(offset));
    last.dayEnd = total;
  }

  return {
    title: multi ? norm.map((s) => s.name).join(" → ") : country.name,
    homeCountry,
    multi,
    meta: {
      duration: plan.duration,
      costPerPerson: plan.costPerPerson,
      cityCount: extractPlanCities(plan.days).length,
      stopCount: norm.length,
    },
    sections,
    note: plan.note,
    warning: plan.warning,
  };
}
