import type { Country } from "../types";

/** Party size the displayed budget/cost figures are computed for. */
export type BudgetBasis = "solo" | "couple" | "family4";

/** App-wide default party size — kept in sync everywhere for DRY consistency. */
export const DEFAULT_BUDGET_BASIS: BudgetBasis = "couple";

/** Stable display order for basis controls. */
export const BUDGET_BASIS_ORDER: readonly BudgetBasis[] = ["solo", "couple", "family4"];

type BasisMeta = { icon: string; label: string; long: string };

/** Single source of truth for basis iconography and labels. */
export const BUDGET_BASIS_META: Record<BudgetBasis, BasisMeta> = {
  solo: { icon: "👤", label: "Solo", long: "per solo traveler" },
  couple: { icon: "👫", label: "Couple", long: "per couple" },
  family4: { icon: "👨‍👩‍👧‍👦", label: "Family", long: "per family of 4" },
};

/** Runtime guard for persisted/user-supplied values (resilience). */
export function isBudgetBasis(value: unknown): value is BudgetBasis {
  return value === "solo" || value === "couple" || value === "family4";
}

/**
 * Budget string for the requested basis, falling back to the single `budget`
 * field when a country has no per-basis breakdown.
 */
export function budgetForBasis(country: Country, basis: BudgetBasis): string {
  return country.budgetBreakdown?.[basis] ?? country.budget;
}

/**
 * Multipliers applied to a solo (per-person) budget to derive couple and
 * family-of-4 totals. Calibrated from the median ratios across all 198
 * rule-backed destinations (couple/solo ≈ 1.77, family4/solo ≈ 3.45), which
 * are tightly clustered (couple 1.63–1.92, family4 3.02–3.82). Shared lodging
 * and transport are why these are sub-linear in party size.
 */
export const BASIS_MULTIPLIER: Record<BudgetBasis, number> = {
  solo: 1,
  couple: 1.77,
  family4: 3.45,
};

/** Parse a "₹1.5L" / "₹150K" / "₹80,000" token into a rupee number. */
function parseAmount(token: string): number | null {
  const match = /([\d.,]+)\s*([LKlk])?/.exec(token.trim());
  if (!match) return null;
  const value = parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  const unit = match[2]?.toLowerCase();
  if (unit === "l") return value * 1e5;
  if (unit === "k") return value * 1e3;
  return value;
}

/**
 * Parse a "lo–hi" (or single-value) budget/cost string into a `[low, high]`
 * rupee range. Single values yield `[v, v]`; unparseable input yields `null`.
 * The canonical range parser reused by budget tiering and trip-cost scaling so
 * the "₹XL/₹XK" grammar lives in exactly one place.
 */
export function parseBudgetRange(range: string): [number, number] | null {
  const parts = range
    .split(/[–-]/)
    .map((p) => parseAmount(p))
    .filter((n): n is number => n != null);
  if (parts.length === 0) return null;
  const low = Math.min(...parts);
  const high = Math.max(...parts);
  return [low, high];
}

/** Format a rupee number back into the app's compact "₹XL" / "₹XK" style. */
function formatAmount(value: number): string {
  if (value >= 1e5) {
    const lakhs = Math.round((value / 1e5) * 2) / 2; // nearest 0.5L
    return `₹${Number.isInteger(lakhs) ? lakhs : lakhs.toFixed(1)}L`;
  }
  const thousands = Math.max(1, Math.round(value / 1e3 / 5) * 5); // nearest 5K
  return `₹${thousands}K`;
}

/** Scale a "lo–hi" (or single-value) budget range by a multiplier. */
function scaleRange(range: string, multiplier: number): string {
  const parts = range.split(/[–-]/).map((p) => p.trim()).filter(Boolean);
  const scaled = parts
    .map(parseAmount)
    .map((n) => (n == null ? null : formatAmount(n * multiplier)));
  if (scaled.some((s) => s == null)) return range; // unparseable — leave as-is
  return scaled.join("–");
}

/**
 * Derive a full per-basis breakdown from a single solo (per-person) budget
 * range, keeping couple/family totals consistent and DRY. Returns empty
 * strings when the solo input is blank.
 */
export function deriveBudgetBreakdown(solo: string): {
  solo: string;
  couple: string;
  family4: string;
} {
  const trimmed = solo.trim();
  if (!trimmed) return { solo: "", couple: "", family4: "" };
  return {
    solo: trimmed,
    couple: scaleRange(trimmed, BASIS_MULTIPLIER.couple),
    family4: scaleRange(trimmed, BASIS_MULTIPLIER.family4),
  };
}
