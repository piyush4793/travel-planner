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

type CityRule = {
  name: string;
  minDays: number;
  recDays: number;
  maxDays: number;
  note?: string;
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
