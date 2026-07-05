import { useState, useEffect, useCallback } from "react";
import { loadLS, saveLS } from "../core/storage";

/**
 * Persisted Set<string> backed by localStorage.
 * DRY replacement for repeated visited/favorites/myList patterns.
 */
export function usePersistedSet(key: string, init: () => Set<string>) {
  const [set, setSet] = useState<Set<string>>(init);

  useEffect(() => { saveLS(key, [...set]); }, [key, set]);

  // Reconcile when another tab mutates the same key (storage events only fire cross-tab).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue == null) return;
      let incoming: string[];
      try {
        const parsed = JSON.parse(e.newValue);
        if (!Array.isArray(parsed)) return;
        incoming = parsed.filter((v): v is string => typeof v === "string");
      } catch { return; }
      setSet((prev) => {
        if (prev.size === incoming.length && incoming.every((v) => prev.has(v))) return prev;
        return new Set(incoming);
      });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  const toggle = useCallback((name: string) => {
    setSet((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const add = useCallback((name: string) => {
    setSet((prev) => new Set(prev).add(name));
  }, []);

  const remove = useCallback((name: string) => {
    setSet((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, []);

  // Re-hydrate from localStorage (soft refresh — e.g. pull-to-refresh, or after
  // an external import wrote new data). Guards against non-string-array payloads.
  const reload = useCallback(() => {
    const raw = loadLS<unknown>(key, []);
    const next = Array.isArray(raw)
      ? raw.filter((v): v is string => typeof v === "string")
      : [];
    setSet(new Set(next));
  }, [key]);

  return { set, setSet, toggle, add, remove, reload } as const;
}
