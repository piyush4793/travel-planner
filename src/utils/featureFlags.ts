import { loadLS, saveLS } from "./storage";
import { LS_KEYS } from "./lsKeys";

/**
 * Feature gates — opt-in flags stored in localStorage.
 * Toggle via browser console: localStorage.setItem('tp_features', JSON.stringify({...}))
 *
 * Two-tier gating:
 *   paidFeatures — master gate for premium features (false = all paid features hidden)
 *   Individual flags — fine-grained control within a tier
 *
 * A paid feature requires BOTH paidFeatures=true AND its own flag=true.
 */
export type FeatureFlags = {
  searchableHomeCountry: boolean;
  llmPlanning: boolean;
  pdfExport: boolean;
  paidFeatures: boolean;
};

// Which individual flags require paidFeatures to be true
export const PAID_FLAGS: ReadonlySet<keyof FeatureFlags> = new Set(["llmPlanning", "pdfExport"]);

const DEFAULTS: FeatureFlags = {
  searchableHomeCountry: false,
  llmPlanning: true,
  pdfExport: true,
  paidFeatures: false,
};

let _cache: FeatureFlags | null = null;

export function getFeatureFlags(): FeatureFlags {
  if (_cache) return _cache;
  const stored = loadLS<Partial<FeatureFlags>>(LS_KEYS.FEATURES, {});
  _cache = { ...DEFAULTS, ...stored };
  return _cache;
}

export function setFeatureFlag<K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]): void {
  const flags = getFeatureFlags();
  flags[key] = value;
  _cache = flags;
  saveLS(LS_KEYS.FEATURES, flags);
}

/** Check if a feature is enabled. Paid features also require paidFeatures=true. */
export function isEnabled(flag: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  if (PAID_FLAGS.has(flag) && !flags.paidFeatures) return false;
  return flags[flag];
}

/** Check if the paid tier is active */
export function isPaidTier(): boolean {
  return getFeatureFlags().paidFeatures;
}
