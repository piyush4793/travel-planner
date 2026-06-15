import { useState, useEffect, useCallback } from "react";
import { saveLS } from "../storage";

/**
 * Persisted Set<string> backed by localStorage.
 * DRY replacement for repeated visited/favorites/myList patterns.
 */
export function usePersistedSet(key: string, init: () => Set<string>) {
  const [set, setSet] = useState<Set<string>>(init);

  useEffect(() => { saveLS(key, [...set]); }, [key, set]);

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

  return { set, setSet, toggle, add, remove } as const;
}
