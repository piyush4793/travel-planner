import type { LLMTripPlanResult } from "./ai/llmTransform";

export type PlanSummary = {
  duration: string;
  budget: string;
  cities: string[];
  cost: string;
};

export function summarizePlan(result: LLMTripPlanResult): PlanSummary {
  return {
    duration: `${result.durationDays} days`,
    budget: result.budgetLevel,
    cities: result.cities.map((c) => c.name),
    cost: result.plan.costPerPerson,
  };
}

export function formatPlanLabel(result: LLMTripPlanResult, savedAt?: string): string {
  const date = savedAt ? new Date(savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
  const cities = result.cities.map((c) => c.name).join(", ");
  const prefix = date ? `Saved ${date} · ` : "";
  return `${prefix}${result.durationDays}d · ${result.budgetLevel} · ${cities}`;
}
