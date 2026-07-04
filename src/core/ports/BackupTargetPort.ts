import type { BackupTargetKind } from "../platform/defaults";

/** Stable filename used for the "latest" auto-backup so it is always findable. */
export const BACKUP_FILENAME = "roamwise-backup-latest.json";

/** Dedicated app folder created inside whatever location the user selects, so all
 *  Roamwise data lives together and is easy to find / restore. */
export const APP_DIR_NAME = "Roamwise";

export interface BackupWriteResult {
  ok: boolean;
  /** Human-readable place the backup landed (for surfacing in Settings). */
  location: string;
  /** Optional diagnostic detail when ok is false. */
  reason?: string;
}

export interface BackupRecord {
  text: string;
  /** ISO timestamp the backup was produced, if derivable; otherwise null. */
  savedAt: string | null;
}

/**
 * A destination that can silently persist and read back a single "latest" backup.
 *
 * Implementations must be swappable (Liskov): callers depend only on this port,
 * never on the concrete web API. `isReady` reports whether writes/reads can happen
 * without a user gesture; `configure` performs the one-time interactive setup.
 */
export interface BackupTargetPort {
  readonly kind: BackupTargetKind;
  /** Can this target read/write silently right now (no prompt needed)? */
  isReady(): Promise<boolean>;
  /** One-time interactive setup (e.g. pick a folder). Needs a user gesture. */
  configure(): Promise<boolean>;
  /** Persist the latest backup. */
  write(text: string): Promise<BackupWriteResult>;
  /** Read the most recent backup for restore, or null if none/unavailable. */
  readLatest(): Promise<BackupRecord | null>;
  /** Human-readable description of where backups live. */
  location(): Promise<string>;
}
