import { useState, useEffect, useRef } from "react";
import type { CountryRule } from "../core/data/itineraryRules";
import {
  fileKey,
  hasConsolidatedCountry,
  loadConsolidatedCountry,
  getCachedConsolidatedCountry,
  type ConsolidatedCountry,
} from "../data/consolidatedCountry";

export { fileKey, loadConsolidatedCountry };

export type UseCountryRuleResult = {
  data: ConsolidatedCountry | null;
  rule: CountryRule | null;
  loading: boolean;
};

/** React hook — loads consolidated country data, returns { data, rule, loading } */
export function useCountryRule(countryName: string | undefined): UseCountryRuleResult {
  const [data, setData] = useState<ConsolidatedCountry | null>(
    () => (countryName ? getCachedConsolidatedCountry(countryName) ?? null : null),
  );
  const [loading, setLoading] = useState(false);
  const nameRef = useRef(countryName);

  useEffect(() => {
    nameRef.current = countryName;
    if (!countryName) { setData(null); setLoading(false); return; }

    const cached = getCachedConsolidatedCountry(countryName);
    if (cached !== undefined) { setData(cached); setLoading(false); return; }

    if (!hasConsolidatedCountry(countryName)) { setData(null); setLoading(false); return; }

    setLoading(true);
    loadConsolidatedCountry(countryName).then((r) => {
      if (nameRef.current === countryName) {
        setData(r);
        setLoading(false);
      }
    });
  }, [countryName]);

  return { data, rule: data?.itinerary ?? null, loading };
}
