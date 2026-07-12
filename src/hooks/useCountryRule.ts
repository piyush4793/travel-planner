import { useState, useEffect, useRef } from "react";
import type { CountryRule } from "../core/data/itineraryRules";
import type { ConsolidatedCountry, ConsolidatedLoader } from "../data/consolidatedLoader";
import { internationalRuleStore } from "../data/consolidatedCountry";

export type UseCountryRuleResult = {
  data: ConsolidatedCountry | null;
  rule: CountryRule | null;
  loading: boolean;
};

/**
 * React hook — loads consolidated destination data, returns { data, rule, loading }.
 *
 * `store` selects which scope's rule chunks to read (world countries by default,
 * or a domestic dataset). It defaults to the international store so every
 * single-country caller stays unchanged; the Plan wizard passes the active
 * scope's store so a domestic primary stop resolves against the right dataset.
 */
export function useCountryRule(
  countryName: string | undefined,
  store: ConsolidatedLoader = internationalRuleStore,
): UseCountryRuleResult {
  const [data, setData] = useState<ConsolidatedCountry | null>(
    () => (countryName ? store.getCached(countryName) ?? null : null),
  );
  const [loading, setLoading] = useState(false);
  const nameRef = useRef(countryName);

  useEffect(() => {
    nameRef.current = countryName;
    if (!countryName) { setData(null); setLoading(false); return; }

    const cached = store.getCached(countryName);
    if (cached !== undefined) { setData(cached); setLoading(false); return; }

    if (!store.has(countryName)) { setData(null); setLoading(false); return; }

    setLoading(true);
    store.load(countryName).then((r) => {
      if (nameRef.current === countryName) {
        setData(r);
        setLoading(false);
      }
    }).catch(() => {
      if (nameRef.current === countryName) {
        setData(null);
        setLoading(false);
      }
    });
  }, [countryName, store]);

  return { data, rule: data?.itinerary ?? null, loading };
}
