import { useCallback, useEffect, useMemo, useState } from "react";
import { loadLS, saveLS } from "../core/storage";
import { LS_KEYS } from "../core/lsKeys";
import { usePersistedSet } from "./usePersistedSet";

export type LifecyclePromptKind = "add-to-list" | "favorite" | "backup";

export type LifecyclePrompt = {
  /** Stable id incl. context (e.g. "favorite:Norway") — drives dismissal memory. */
  id: string;
  kind: LifecyclePromptKind;
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
};

/** Persisted marker so a backup nudge snoozes until enough *new* changes pile up. */
type Baseline = { backupAt: string; fingerprint: number };

export type LifecyclePromptsDeps = {
  /** Destinations in My List — gates the add-to-list nudge. */
  myListCount: number;
  /** Coarse measure of user-data volume; its growth since the last backup drives the backup nudge. */
  dataFingerprint: number;
  /** `LS_KEYS.LAST_BACKUP` value — when it changes the backup baseline resets. */
  lastBackupAt: string;
  isFavorite: (name: string) => boolean;
  onToggleFavorite: (name: string) => void;
  onBackup: () => void | Promise<void>;
  /** Optional "browse destinations" action for the add-to-list nudge. */
  onExplore?: () => void;
  /** Net new changes since the last backup that count as "significant". */
  backupThreshold?: number;
  /** Delay before a computed prompt surfaces, so it never flashes during rapid state changes. */
  debounceMs?: number;
};

export type LifecyclePrompts = {
  /** The single prompt currently worth showing, or null. */
  prompt: LifecyclePrompt | null;
  /** Run the prompt's primary action, then retire it. */
  act: () => void | Promise<void>;
  /** Dismiss the prompt (permanent for onboarding nudges, snooze for backup). */
  dismiss: () => void;
  /** Signal that the traveller performed a search (arms the add-to-list nudge). */
  notifySearch: () => void;
  /** Signal that the traveller committed to a plan for a destination (arms the favorite nudge). */
  notifyPlanCreated: (country: string) => void;
};

const DEFAULT_BACKUP_THRESHOLD = 6;
const DEFAULT_DEBOUNCE_MS = 600;

/**
 * Soft, non-blocking lifecycle nudges. At most one prompt shows at a time,
 * chosen by priority (favorite → backup → add-to-list). Onboarding nudges
 * (add-to-list / favorite) are dismissed permanently via a persisted set; the
 * backup nudge instead snoozes by advancing its change baseline, so it returns
 * only once enough *new* changes accumulate. Surfacing is debounced.
 */
export function useLifecyclePrompts(deps: LifecyclePromptsDeps): LifecyclePrompts {
  const {
    myListCount,
    dataFingerprint,
    lastBackupAt,
    isFavorite,
    onToggleFavorite,
    onBackup,
    onExplore,
    backupThreshold = DEFAULT_BACKUP_THRESHOLD,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = deps;

  const dismissed = usePersistedSet(LS_KEYS.LIFECYCLE_DISMISSED, () =>
    new Set(loadLS<string[]>(LS_KEYS.LIFECYCLE_DISMISSED, [])),
  );

  const [searched, setSearched] = useState(false);
  const [planCountry, setPlanCountry] = useState<string | null>(null);

  // Track how much the data has grown since the last backup. The baseline resets
  // whenever a backup happens (LAST_BACKUP timestamp changes).
  const [changesSinceBackup, setChangesSinceBackup] = useState(0);
  useEffect(() => {
    const baseline = loadLS<Baseline | null>(LS_KEYS.LIFECYCLE_BASELINE, null);
    if (!baseline || baseline.backupAt !== lastBackupAt) {
      saveLS(LS_KEYS.LIFECYCLE_BASELINE, { backupAt: lastBackupAt, fingerprint: dataFingerprint });
      setChangesSinceBackup(0);
      return;
    }
    setChangesSinceBackup(Math.max(0, dataFingerprint - baseline.fingerprint));
  }, [dataFingerprint, lastBackupAt]);

  const snoozeBackup = useCallback(() => {
    saveLS(LS_KEYS.LIFECYCLE_BASELINE, { backupAt: lastBackupAt, fingerprint: dataFingerprint });
    setChangesSinceBackup(0);
  }, [lastBackupAt, dataFingerprint]);

  const notifySearch = useCallback(() => setSearched(true), []);
  const notifyPlanCreated = useCallback((country: string) => setPlanCountry(country), []);

  // Highest-priority prompt whose conditions currently hold and that hasn't been retired.
  const candidate = useMemo<LifecyclePrompt | null>(() => {
    if (planCountry && !isFavorite(planCountry)) {
      const id = `favorite:${planCountry}`;
      if (!dismissed.set.has(id)) {
        return {
          id,
          kind: "favorite",
          message: `Loved planning ${planCountry}? Save it to your favorites for quick access.`,
          actionLabel: "★ Favorite",
          onAction: () => onToggleFavorite(planCountry),
        };
      }
    }
    if (changesSinceBackup >= backupThreshold) {
      return {
        id: "backup",
        kind: "backup",
        message: "You've made a few changes since your last backup. Keep them safe?",
        actionLabel: "Back up now",
        onAction: onBackup,
      };
    }
    if (searched && myListCount === 0 && !dismissed.set.has("add-to-list")) {
      return {
        id: "add-to-list",
        kind: "add-to-list",
        message: "Found somewhere you love? Add it to your list to start planning.",
        actionLabel: onExplore ? "Browse" : undefined,
        onAction: onExplore,
      };
    }
    return null;
  }, [planCountry, isFavorite, dismissed.set, changesSinceBackup, backupThreshold, searched, myListCount, onExplore, onToggleFavorite, onBackup]);

  // Debounce surfacing: only reveal a candidate once it has been stable for debounceMs.
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const candidateId = candidate?.id ?? null;
  useEffect(() => {
    if (!candidateId) {
      setVisibleId(null);
      return;
    }
    if (candidateId === visibleId) return;
    const t = setTimeout(() => setVisibleId(candidateId), debounceMs);
    return () => clearTimeout(t);
  }, [candidateId, visibleId, debounceMs]);

  const prompt = candidate && candidate.id === visibleId ? candidate : null;

  const retire = useCallback((p: LifecyclePrompt) => {
    if (p.kind === "backup") snoozeBackup();
    else dismissed.add(p.id);
    if (p.kind === "favorite") setPlanCountry(null);
    setVisibleId(null);
  }, [dismissed, snoozeBackup]);

  const dismiss = useCallback(() => {
    if (prompt) retire(prompt);
  }, [prompt, retire]);

  const act = useCallback(async () => {
    if (!prompt) return;
    const p = prompt;
    setVisibleId(null);
    if (p.kind === "favorite") setPlanCountry(null);
    else if (p.kind === "add-to-list") dismissed.add(p.id);
    // Backup resolves itself: onBackup advances LAST_BACKUP → baseline resets.
    await p.onAction?.();
  }, [prompt, dismissed]);

  return { prompt, act, dismiss, notifySearch, notifyPlanCreated };
}
