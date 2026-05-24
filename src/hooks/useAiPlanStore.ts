import { useState, useCallback } from "react";
import type { LLMTripPlanResult } from "../utils/ai/llmTransform";
import { loadLS, saveLS } from "../utils/storage";
import { LS_KEYS } from "../utils/lsKeys";

const MAX_PLANS_PER_DESTINATION = 4;
const SCHEMA_VERSION = 1;

export type SavedAiPlan = {
  id: string;
  schemaVersion: number;
  savedAt: string;
  destinationKey: string;
  destinationName: string;
  result: LLMTripPlanResult;
};

type PlanStore = Record<string, SavedAiPlan[]>;

export function normalizeDestinationKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadStore(): PlanStore {
  const raw = loadLS<PlanStore>(LS_KEYS.AI_PLANS, {});
  // Defensive: filter out malformed entries
  const clean: PlanStore = {};
  for (const [key, plans] of Object.entries(raw)) {
    if (!Array.isArray(plans)) continue;
    clean[key] = plans.filter(
      (p) => p && typeof p === "object" && p.id && p.result && p.destinationKey,
    );
  }
  return clean;
}

export function useAiPlanStore() {
  const [store, setStore] = useState<PlanStore>(loadStore);

  const persistUpdate = useCallback((updater: (prev: PlanStore) => PlanStore) => {
    setStore((prev) => {
      const next = updater(prev);
      saveLS(LS_KEYS.AI_PLANS, next);
      return next;
    });
  }, []);

  const getPlans = useCallback(
    (destinationName: string): SavedAiPlan[] => {
      const key = normalizeDestinationKey(destinationName);
      return store[key] ?? [];
    },
    [store],
  );

  const savePlan = useCallback(
    (result: LLMTripPlanResult): SavedAiPlan => {
      const key = normalizeDestinationKey(result.destinationName);
      const plan: SavedAiPlan = {
        id: generateId(),
        schemaVersion: SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        destinationKey: key,
        destinationName: result.destinationName,
        result,
      };
      persistUpdate((prev) => {
        const existing = prev[key] ?? [];
        const updated = [...existing, plan].slice(-MAX_PLANS_PER_DESTINATION);
        return { ...prev, [key]: updated };
      });
      return plan;
    },
    [persistUpdate],
  );

  const replacePlan = useCallback(
    (planId: string, result: LLMTripPlanResult): SavedAiPlan => {
      const key = normalizeDestinationKey(result.destinationName);
      const replacement: SavedAiPlan = {
        id: generateId(),
        schemaVersion: SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        destinationKey: key,
        destinationName: result.destinationName,
        result,
      };
      persistUpdate((prev) => {
        const existing = prev[key] ?? [];
        const updated = existing.map((p) => (p.id === planId ? replacement : p));
        return { ...prev, [key]: updated };
      });
      return replacement;
    },
    [persistUpdate],
  );

  const deletePlan = useCallback(
    (destinationName: string, planId: string) => {
      const key = normalizeDestinationKey(destinationName);
      persistUpdate((prev) => {
        const existing = prev[key] ?? [];
        const updated = existing.filter((p) => p.id !== planId);
        const next = { ...prev };
        if (updated.length === 0) {
          delete next[key];
        } else {
          next[key] = updated;
        }
        return next;
      });
    },
    [persistUpdate],
  );

  const getAllDestinations = useCallback((): string[] => {
    return Object.keys(store).filter((k) => (store[k]?.length ?? 0) > 0);
  }, [store]);

  const canAddNew = useCallback(
    (destinationName: string): boolean => {
      return getPlans(destinationName).length < MAX_PLANS_PER_DESTINATION;
    },
    [getPlans],
  );

  return { getPlans, savePlan, replacePlan, deletePlan, getAllDestinations, canAddNew, maxPlans: MAX_PLANS_PER_DESTINATION };
}
