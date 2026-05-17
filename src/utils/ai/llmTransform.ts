import type { DayEntry, TripPlan } from "../tripPlans";

export type LLMTripPlanResult = {
  destinationName: string;
  originCountry: string;
  travelers: number;
  durationDays: number;
  budgetLevel: "budget" | "mid-range" | "luxury";
  assumptions: string[];
  plan: TripPlan;
};

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isValidDay(d: unknown): d is DayEntry {
  if (!d || typeof d !== "object") return false;
  const obj = d as Record<string, unknown>;
  if (typeof obj.label !== "string" || !obj.label) return false;
  if (!isStringArray(obj.activities) || obj.activities.length === 0) return false;
  if (obj.theme !== undefined && typeof obj.theme !== "string") return false;
  if (obj.hotels !== undefined && !isStringArray(obj.hotels)) return false;
  return true;
}

function isValidPlan(p: unknown): p is TripPlan {
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
      plan: obj.plan,
    },
  };
}
