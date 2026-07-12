import { LS_KEYS } from "./lsKeys";
import { getStorageAdapter } from "./storage";
import type { StoragePort } from "./ports/StoragePort";

/**
 * Current persisted-data schema version. Bump this whenever the on-disk shape
 * of any localStorage value changes, and append a matching {@link Migration}.
 *
 * v1 is the baseline: every persisted shape that shipped before versioning
 * existed is defined as v1, so pre-versioning stores are simply stamped as v1
 * (no data transform needed).
 */
export const SCHEMA_VERSION = 3;

export interface Migration {
  /** Target version this migration upgrades the persisted data TO. */
  version: number;
  /** Human-readable description of the shape change (for maintainers). */
  description: string;
  /** Perform the in-place data transformation against the given storage. */
  migrate: (storage: StoragePort) => void;
}

/**
 * Ordered registry of schema migrations. Each entry upgrades persisted data to
 * its `version`. APPEND new migrations only — never renumber or reorder, and
 * never drop an entry, or older stores will skip a step.
 *
 * v2: country-level Favorite/Visited were retired (My List became implicit
 * Recents). Delete the now-dead `tp_visited` / `tp_favorites` keys so they stop
 * lingering in storage and in backups.
 *
 * v3: "My List" changed meaning from a hand-curated/seeded set into an implicit
 * "Recents" planning history that reuses the same `tp_my_list` key. The legacy
 * value (auto-seeded `inSeed` countries + anything manually added under the old
 * model) was never a record of planning intent, so it would masquerade as
 * "recently planned". Clear it once so Recents starts from an honest clean slate
 * and only genuine planning actions populate it going forward.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 2,
    description: "Remove retired country-level visited/favorites keys",
    migrate: (storage) => {
      storage.removeItem("tp_visited");
      storage.removeItem("tp_favorites");
    },
  },
  {
    version: 3,
    description: "Clear legacy My List so Recents starts empty",
    migrate: (storage) => {
      storage.removeItem("tp_my_list");
    },
  },
];

/** Read the persisted schema version. Returns 0 when never stamped/invalid. */
export function readStoredVersion(storage: StoragePort): number {
  const raw = storage.getItem(LS_KEYS.SCHEMA_VERSION);
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

/**
 * Apply every migration whose target version is greater than `storedVersion`,
 * in ascending version order, returning the resulting version. Pure with
 * respect to the injected list + storage, so it is straightforward to unit-test.
 */
export function applyMigrations(
  storedVersion: number,
  migrations: Migration[],
  storage: StoragePort,
): number {
  let version = storedVersion;
  const ordered = [...migrations].sort((a, b) => a.version - b.version);
  for (const m of ordered) {
    if (m.version > version) {
      m.migrate(storage);
      version = m.version;
    }
  }
  return version;
}

/**
 * Run pending migrations against the active storage adapter, then stamp the
 * current schema version. Intended to run once at startup, before the app
 * reads any persisted data. Never throws — a failed migration must not block
 * boot; the app still falls back to safe defaults via {@link loadLS}.
 */
export function runMigrations(storage: StoragePort = getStorageAdapter()): void {
  try {
    const stored = readStoredVersion(storage);
    if (stored >= SCHEMA_VERSION) return;
    const resolved = applyMigrations(stored, MIGRATIONS, storage);
    storage.setItem(LS_KEYS.SCHEMA_VERSION, String(Math.max(resolved, SCHEMA_VERSION)));
  } catch (e) {
    console.warn("[migrations] failed to run schema migrations", e);
  }
}
