import { useCallback, useEffect, useMemo, useState } from "react";
import { loadLS, saveLS } from "../core/storage";
import { LS_KEYS } from "../core/lsKeys";

export type LifecyclePromptKind = "backup";

export type LifecyclePrompt = {
  /** Stable id — drives snooze memory. */
  id: string;
  kind: LifecyclePromptKind;
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
};

/** Persisted marker so a backup nudge snoozes until enough *new* changes pile up. */
type Baseline = { backupAt: string; fingerprint: number };

export type LifecyclePromptsDeps = {
  /** Coarse measure of user-data volume; its growth since the last backup drives the backup nudge. */
  dataFingerprint: number;
  /** `LS_KEYS.LAST_BACKUP` value — when it changes the backup baseline resets. */
  lastBackupAt: string;
  onBackup: () => void | Promise<void>;
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
  /** Dismiss the prompt (snoozes the backup nudge until enough new changes). */
  dismiss: () => void;
};

const DEFAULT_BACKUP_THRESHOLD = 6;
const DEFAULT_DEBOUNCE_MS = 600;

/**
 * Soft, non-blocking backup nudge. The prompt returns only once enough *new*
 * changes accumulate since the last backup: it snoozes by advancing its change
 * baseline, and resets whenever a backup happens. Surfacing is debounced so it
 * never flashes during rapid state changes.
 */
export function useLifecyclePrompts(deps: LifecyclePromptsDeps): LifecyclePrompts {
  const {
    dataFingerprint,
    lastBackupAt,
    onBackup,
    backupThreshold = DEFAULT_BACKUP_THRESHOLD,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  } = deps;

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

  const candidate = useMemo<LifecyclePrompt | null>(() => {
    if (changesSinceBackup >= backupThreshold) {
      return {
        id: "backup",
        kind: "backup",
        message: "You've made a few changes since your last backup. Keep them safe?",
        actionLabel: "Back up now",
        onAction: onBackup,
      };
    }
    return null;
  }, [changesSinceBackup, backupThreshold, onBackup]);

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

  const dismiss = useCallback(() => {
    if (prompt) { snoozeBackup(); setVisibleId(null); }
  }, [prompt, snoozeBackup]);

  const act = useCallback(async () => {
    if (!prompt) return;
    const p = prompt;
    setVisibleId(null);
    // Backup resolves itself: onBackup advances LAST_BACKUP → baseline resets.
    await p.onAction?.();
  }, [prompt]);

  return { prompt, act, dismiss };
}
