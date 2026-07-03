import type { Country } from "../../../core/types";
import type { TripPlan } from "../../../core/utils/tripPlans";
import { extractPlanCities, planCostBasisIcon } from "../../../core/utils/tripPlans";

/** Build the shareable text summary — includes the itinerary when a plan exists. */
export function buildShareText(country: Country, homeCountry: string, plan?: TripPlan | null): string {
  const lines: string[] = [`✈️ ${country.name}`, `From: ${homeCountry}`];

  if (plan) {
    lines.push(`📅 ${plan.duration} · 💰 ${plan.costPerPerson} ${planCostBasisIcon(plan)}`);
    const route = extractPlanCities(plan.days);
    if (route.length > 0) lines.push(`Route: ${route.join(" → ")}`);
  }

  if (country.bestMonths.length > 0) {
    lines.push(`Best months: ${country.bestMonths.join(", ")}`);
  }
  if (country.budget) {
    lines.push(`Budget: ${country.budget}`);
  }
  if (country.experiences.length > 0) {
    lines.push(`Experiences: ${country.experiences.join(", ")}`);
  }
  if (!plan && country.cities && country.cities.length > 0) {
    lines.push(`Cities: ${country.cities.map((c) => c.name).join(", ")}`);
  }
  if (country.combo && country.combo.length > 0) {
    lines.push(`Combine with: ${country.combo.join(", ")}`);
  }

  if (plan && plan.days.length > 0) {
    lines.push("", "Day-by-day:");
    for (const day of plan.days) {
      lines.push(day.theme ? `${day.label}: ${day.theme}` : day.label);
    }
  }

  if (country.notes) {
    lines.push(`\nNotes: ${country.notes}`);
  }

  return lines.join("\n");
}
