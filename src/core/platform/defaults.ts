import type { PlatformProfile } from "./platformProfile";

/** Where auto-backups are written. Ordered from most to least "findable". */
export type BackupTargetKind = "filesystem" | "opfs" | "download";

export interface PlatformDefaults {
  /** Preferred backup destination for this platform. */
  backupTarget: BackupTargetKind;
  /** Whether a fresh/empty device should auto-restore from the target. */
  autoImport: boolean;
}

/**
 * Resolve sensible defaults from a platform profile.
 *
 * Desktop and mobile get different *presets* over the same capability set:
 * desktop prefers a user-chosen folder (findable in the file manager); mobile
 * prefers silent OPFS (app-private, then shared out on demand). Both fall back
 * to a plain download when neither persistent API is available.
 */
export function resolvePlatformDefaults(profile: PlatformProfile): PlatformDefaults {
  const { fileSystemAccess, opfs } = profile.capabilities;

  const backupTarget: BackupTargetKind =
    profile.formFactor === "desktop"
      ? fileSystemAccess ? "filesystem" : opfs ? "opfs" : "download"
      : opfs ? "opfs" : fileSystemAccess ? "filesystem" : "download";

  return {
    backupTarget,
    // Only persistent targets can be read back automatically; downloads can't.
    autoImport: backupTarget !== "download",
  };
}
