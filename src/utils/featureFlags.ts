import { loadLS, saveLS } from "./storage";

/**
 * Feature gates — opt-in flags stored in localStorage.
 * Toggle via browser console: localStorage.setItem('tp_features', JSON.stringify({...}))
 */
export type FeatureFlags = {
  searchableHomeCountry: boolean;
};

const DEFAULTS: FeatureFlags = {
  searchableHomeCountry: false,
};

let _cache: FeatureFlags | null = null;

export function getFeatureFlags(): FeatureFlags {
  if (_cache) return _cache;
  const stored = loadLS<Partial<FeatureFlags>>("tp_features", {});
  _cache = { ...DEFAULTS, ...stored };
  return _cache;
}

export function setFeatureFlag<K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]): void {
  const flags = getFeatureFlags();
  flags[key] = value;
  _cache = flags;
  saveLS("tp_features", flags);
}

export function isEnabled(flag: keyof FeatureFlags): boolean {
  return getFeatureFlags()[flag];
}
