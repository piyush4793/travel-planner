import { useCallback, useEffect, useState } from "react";
import { loadLS, saveLS } from "../core/storage";
import { LS_KEYS } from "../core/lsKeys";
import { DEFAULT_BUDGET_BASIS, isBudgetBasis, type BudgetBasis } from "../core/utils/budget";

export type BudgetBasisState = {
  /** Persisted default party size (survives refresh). Set from the Header. */
  globalBasis: BudgetBasis;
  /** In-session basis that drives all cost/budget displays. Seeded from global. */
  activeBasis: BudgetBasis;
  /** Update the persisted default and snap the active basis back to it. */
  setGlobalBasis: (basis: BudgetBasis) => void;
  /** Temporarily change the active basis (e.g. Trips "play around"); not persisted. */
  setActiveBasis: (basis: BudgetBasis) => void;
  /** Re-read the persisted default from localStorage (soft refresh). */
  reload: () => void;
};

/**
 * Two-layer budget basis: a persisted global default plus a transient active
 * value. The Header edits the default (and resets active to it); the Trips pill
 * nudges only the active value for quick what-if exploration.
 */
export function useBudgetBasis(): BudgetBasisState {
  const [globalBasis, setGlobalBasisState] = useState<BudgetBasis>(() => {
    const stored = loadLS<BudgetBasis>(LS_KEYS.BUDGET_BASIS, DEFAULT_BUDGET_BASIS);
    return isBudgetBasis(stored) ? stored : DEFAULT_BUDGET_BASIS;
  });
  const [activeBasis, setActiveBasis] = useState<BudgetBasis>(globalBasis);

  useEffect(() => {
    saveLS(LS_KEYS.BUDGET_BASIS, globalBasis);
  }, [globalBasis]);

  const setGlobalBasis = useCallback((basis: BudgetBasis) => {
    setGlobalBasisState(basis);
    setActiveBasis(basis);
  }, []);

  const reload = useCallback(() => {
    const stored = loadLS<BudgetBasis>(LS_KEYS.BUDGET_BASIS, DEFAULT_BUDGET_BASIS);
    const next = isBudgetBasis(stored) ? stored : DEFAULT_BUDGET_BASIS;
    setGlobalBasisState(next);
    setActiveBasis(next);
  }, []);

  return { globalBasis, activeBasis, setGlobalBasis, setActiveBasis, reload };
}
