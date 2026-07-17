type RuleActivity = {
  name: string;
  /** Rough time on the ground, e.g. "2–3h" — used to keep a day feasible. */
  duration?: string;
  /** Feasibility/priority tier so a tight day can be trimmed sensibly. */
  priority?: "must-see" | "recommended" | "optional";
  cost?: string;
  tip?: string;
};

type RuleDayPlan = {
  theme: string;
  /** Overall day tempo, e.g. "relaxed" | "moderate" | "packed". */
  pace?: string;
  /** One-line logistics/feasibility note for the day. */
  note?: string;
  activities: RuleActivity[];
  /**
   * Recommended stays. Authored as a tiered set (budget / mid / premium) on the
   * arrival day of each stop; `tier` groups them for a future tiered UI. The
   * itinerary renderer currently surfaces the first couple by name.
   */
  hotels?: { name: string; budget: string; tier?: "budget" | "mid" | "premium" }[];
  meals?: string[];
};

export type CityRule = {
  name: string;
  minDays: number;
  recDays: number;
  maxDays: number;
  note?: string;
  /** Optional authored override for the experiences this city satisfies. */
  experiences?: string[];
  /**
   * Subset of `experiences` for which this city is THE iconic place (e.g.
   * Geirangerfjord for Fjords). Signature matches outrank ordinary authored
   * matches so a natural wonder wins its theme over a bigger hub city.
   */
  signatureExperiences?: string[];
  days: RuleDayPlan[];
};

export type CountryRule = {
  sim?: string;
  apps?: string[];
  cityOrder: string[];
  cities: Record<string, CityRule>;
  connections: {
    from: string;
    to: string;
    method: string;
    cost?: string;
    modes?: { mode: string; duration: string; cost: string; note?: string }[];
    skipped?: string;
  }[];
  extras?: string[];
  cityImages?: Record<string, string[]>;
};
