import type { DayEntry, TripPlan } from "../tripPlans";

/* ── LLM-specific enriched types ── */

export type LLMDailyCostBreakdown = {
  flights?: string;
  hotels?: string;
  excursions?: string;
  transfers?: string;
  total?: string;
};

export type LLMCityInfo = {
  name: string;
  lat: number;
  lng: number;
  nights: number;
  transportToNext?: {
    type: "flight" | "train" | "ferry" | "bus" | "cable-car" | "drive";
    label: string;
    cost?: string;
  };
};

export type LLMDayEntry = DayEntry & {
  costBreakdown?: LLMDailyCostBreakdown;
  bookingSuggestions?: string[];
};

export type LLMTripPlan = Omit<TripPlan, "days"> & {
  days: LLMDayEntry[];
};

export type LLMDestinationMeta = {
  bestMonths: string[];
  worstMonths: string[];
  thingsToAvoid: string[];
  visaTips?: string;
  comboCountries: string[];
  highlights: string[];
};

export type LLMTripPlanResult = {
  destinationName: string;
  originCountry: string;
  travelers: number;
  durationDays: number;
  budgetLevel: "budget" | "mid-range" | "luxury";
  assumptions: string[];
  cities: LLMCityInfo[];
  meta: LLMDestinationMeta;
  plan: LLMTripPlan;
};

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isValidDay(d: unknown): d is LLMDayEntry {
  if (!d || typeof d !== "object") return false;
  const obj = d as Record<string, unknown>;
  if (typeof obj.label !== "string" || !obj.label) return false;
  if (!isStringArray(obj.activities) || obj.activities.length === 0) return false;
  if (obj.theme !== undefined && typeof obj.theme !== "string") return false;
  if (obj.hotels !== undefined && !isStringArray(obj.hotels)) return false;
  if (obj.bookingSuggestions !== undefined && !isStringArray(obj.bookingSuggestions)) return false;
  // costBreakdown is loosely validated — all fields are optional strings
  if (obj.costBreakdown !== undefined && (typeof obj.costBreakdown !== "object" || obj.costBreakdown === null)) return false;
  return true;
}

function isValidPlan(p: unknown): p is LLMTripPlan {
  if (!p || typeof p !== "object") return false;
  const obj = p as Record<string, unknown>;
  if (typeof obj.duration !== "string") return false;
  if (typeof obj.costPerPerson !== "string") return false;
  if (typeof obj.note !== "string") return false;
  if (!Array.isArray(obj.days) || obj.days.length === 0) return false;
  if (!obj.days.every(isValidDay)) return false;
  if (obj.days.length > 60) return false;
  if (obj.warning !== undefined && typeof obj.warning !== "string") return false;
  return true;
}

function isValidCityInfo(c: unknown): c is LLMCityInfo {
  if (!c || typeof c !== "object") return false;
  const o = c as Record<string, unknown>;
  return typeof o.name === "string" && typeof o.lat === "number" && typeof o.lng === "number";
}

function parseMeta(obj: Record<string, unknown>): LLMDestinationMeta {
  const meta = (obj.meta && typeof obj.meta === "object") ? obj.meta as Record<string, unknown> : {};
  return {
    bestMonths: isStringArray(meta.bestMonths) ? meta.bestMonths : [],
    worstMonths: isStringArray(meta.worstMonths) ? meta.worstMonths : [],
    thingsToAvoid: isStringArray(meta.thingsToAvoid) ? meta.thingsToAvoid : [],
    visaTips: typeof meta.visaTips === "string" ? meta.visaTips : undefined,
    comboCountries: isStringArray(meta.comboCountries) ? meta.comboCountries : [],
    highlights: isStringArray(meta.highlights) ? meta.highlights : [],
  };
}

/**
 * Extract and validate a TripPlan result from raw LLM text.
 * Tries to find JSON in the response (with or without markdown fences).
 */
export function extractTripPlanResult(raw: string): { result: LLMTripPlanResult | null; error?: string } {
  let jsonStr = raw.trim();

  // Strip markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  // Try to find a JSON object in the text
  const braceStart = jsonStr.indexOf("{");
  const braceEnd = jsonStr.lastIndexOf("}");
  if (braceStart === -1 || braceEnd === -1) {
    return { result: null, error: "No JSON object found in the response." };
  }
  jsonStr = jsonStr.slice(braceStart, braceEnd + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { result: null, error: "Failed to parse JSON from the response." };
  }

  if (!parsed || typeof parsed !== "object") {
    return { result: null, error: "Response is not a valid object." };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.destinationName !== "string" || !obj.destinationName) {
    return { result: null, error: "Missing destinationName in response." };
  }

  if (!isValidPlan(obj.plan)) {
    return { result: null, error: "Invalid or incomplete trip plan in response." };
  }

  const rawCities = Array.isArray(obj.cities) ? obj.cities.filter(isValidCityInfo) : [];

  return {
    result: {
      destinationName: obj.destinationName,
      originCountry: typeof obj.originCountry === "string" ? obj.originCountry : "Unknown",
      travelers: typeof obj.travelers === "number" ? obj.travelers : 2,
      durationDays: typeof obj.durationDays === "number" ? obj.durationDays : obj.plan.days.length,
      budgetLevel: ["budget", "mid-range", "luxury"].includes(obj.budgetLevel as string)
        ? (obj.budgetLevel as LLMTripPlanResult["budgetLevel"])
        : "mid-range",
      assumptions: isStringArray(obj.assumptions) ? obj.assumptions : [],
      cities: rawCities as LLMCityInfo[],
      meta: parseMeta(obj),
      plan: obj.plan,
    },
  };
}
