import type { BackupTargetPort } from "../ports/BackupTargetPort";
import type { BackupTargetKind } from "./defaults";
import { resolvePlatformDefaults } from "./defaults";
import { getPlatformProfile } from "./platformProfile";
import { fileSystemBackupTarget } from "../adapters/backup/fileSystemBackupTarget";
import { opfsBackupTarget } from "../adapters/backup/opfsBackupTarget";
import { downloadBackupTarget } from "../adapters/backup/downloadBackupTarget";

const REGISTRY: Record<BackupTargetKind, BackupTargetPort> = {
  filesystem: fileSystemBackupTarget,
  opfs: opfsBackupTarget,
  download: downloadBackupTarget,
};

export function getBackupTarget(kind: BackupTargetKind): BackupTargetPort {
  return REGISTRY[kind];
}

/** The platform's recommended target kind (before any user override). */
export function defaultBackupTargetKind(): BackupTargetKind {
  return resolvePlatformDefaults(getPlatformProfile()).backupTarget;
}

/** All targets, for Settings to offer manual switching. */
export function allBackupTargets(): BackupTargetPort[] {
  return [fileSystemBackupTarget, opfsBackupTarget, downloadBackupTarget];
}
