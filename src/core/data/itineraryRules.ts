type RuleActivity = {
  name: string;
  cost?: string;
  tip?: string;
};

type RuleDayPlan = {
  theme: string;
  activities: RuleActivity[];
  hotels?: { name: string; budget: string }[];
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
  connections: { from: string; to: string; method: string; cost?: string }[];
  extras?: string[];
  cityImages?: Record<string, string[]>;
};
