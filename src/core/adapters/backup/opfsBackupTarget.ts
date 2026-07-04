import type { BackupRecord, BackupTargetPort, BackupWriteResult } from "../../ports/BackupTargetPort";
import { APP_DIR_NAME, BACKUP_FILENAME } from "../../ports/BackupTargetPort";
import { openAppDir, readFileInDir, writeFileInDir } from "./appDir";

function opfsRoot(): Promise<FileSystemDirectoryHandle> | null {
  const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
  return storage && typeof storage.getDirectory === "function" ? storage.getDirectory() : null;
}

/**
 * Origin Private File System target: silent, app-private auto-backups that survive
 * reloads without any prompt. Data lives in a dedicated Roamwise folder; not
 * browsable in a file manager, so restore reads it back in-app and users can
 * "share/export" it out via the Settings panel.
 */
export const opfsBackupTarget: BackupTargetPort = {
  kind: "opfs",

  async isReady(): Promise<boolean> {
    return opfsRoot() !== null;
  },

  async configure(): Promise<boolean> {
    return opfsRoot() !== null; // nothing to set up
  },

  async write(text: string): Promise<BackupWriteResult> {
    const root = opfsRoot();
    if (!root) return { ok: false, location: "", reason: "no-opfs" };
    try {
      const appDir = await openAppDir(await root, true);
      if (!appDir) return { ok: false, location: "App private storage", reason: "no-app-dir" };
      await writeFileInDir(appDir, BACKUP_FILENAME, text);
      return { ok: true, location: `App private storage / ${APP_DIR_NAME}` };
    } catch (err) {
      return { ok: false, location: "App private storage", reason: (err as Error).message };
    }
  },

  async readLatest(): Promise<BackupRecord | null> {
    const root = opfsRoot();
    if (!root) return null;
    const appDir = await openAppDir(await root, false);
    if (!appDir) return null;
    return readFileInDir(appDir, BACKUP_FILENAME);
  },

  async location(): Promise<string> {
    return `App private storage / ${APP_DIR_NAME} / ${BACKUP_FILENAME}`;
  },
};
