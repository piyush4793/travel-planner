import type { BackupRecord, BackupTargetPort, BackupWriteResult } from "../../ports/BackupTargetPort";
import { APP_DIR_NAME, BACKUP_FILENAME } from "../../ports/BackupTargetPort";
import { clearDirHandle, loadDirHandle, saveDirHandle } from "./handleStore";
import { openAppDir, readFileInDir, writeFileInDir } from "./appDir";

type PermissionState = "granted" | "denied" | "prompt";

interface DirHandleWithPermission extends FileSystemDirectoryHandle {
  queryPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
}

function pickDirectory(): Promise<FileSystemDirectoryHandle> | null {
  const picker = (window as unknown as {
    showDirectoryPicker?: (opts?: {
      mode?: "read" | "readwrite";
      startIn?: "documents" | "desktop" | "downloads" | "music" | "pictures" | "videos";
      id?: string;
    }) => Promise<FileSystemDirectoryHandle>;
  }).showDirectoryPicker;
  // startIn opens the picker in Documents (a subfolder there is allowed even
  // though the root is blocked); id makes the browser reopen the last-used dir.
  return picker ? picker({ mode: "readwrite", startIn: "documents", id: "roamwise-backup" }) : null;
}

async function ensurePermission(handle: FileSystemDirectoryHandle, interactive: boolean): Promise<boolean> {
  const h = handle as DirHandleWithPermission;
  if (typeof h.queryPermission !== "function") return true; // some browsers auto-grant
  if ((await h.queryPermission({ mode: "readwrite" })) === "granted") return true;
  if (!interactive || typeof h.requestPermission !== "function") return false;
  return (await h.requestPermission({ mode: "readwrite" })) === "granted";
}

async function usableHandle(interactive: boolean): Promise<FileSystemDirectoryHandle | null> {
  const handle = await loadDirHandle();
  if (!handle) return null;
  return (await ensurePermission(handle, interactive)) ? handle : null;
}

/**
 * Desktop backup target: user picks a folder once; backups are written silently
 * to a stable file inside it, so the file is easy to find and read back for restore.
 */
export const fileSystemBackupTarget: BackupTargetPort = {
  kind: "filesystem",

  async isReady(): Promise<boolean> {
    return (await usableHandle(false)) !== null;
  },

  async configure(): Promise<boolean> {
    const pick = pickDirectory();
    if (!pick) return false;
    try {
      const handle = await pick;
      if (!(await ensurePermission(handle, true))) return false;
      await saveDirHandle(handle);
      return true;
    } catch {
      return false; // user cancelled the picker
    }
  },

  async write(text: string): Promise<BackupWriteResult> {
    const handle = await usableHandle(false);
    if (!handle) return { ok: false, location: "", reason: "no-folder" };
    try {
      const appDir = await openAppDir(handle, true);
      if (!appDir) return { ok: false, location: handle.name, reason: "no-app-dir" };
      await writeFileInDir(appDir, BACKUP_FILENAME, text);
      return { ok: true, location: `${handle.name}/${APP_DIR_NAME}` };
    } catch (err) {
      return { ok: false, location: handle.name, reason: (err as Error).message };
    }
  },

  async readLatest(): Promise<BackupRecord | null> {
    const handle = await usableHandle(false);
    if (!handle) return null;
    const appDir = await openAppDir(handle, false);
    if (!appDir) return null;
    return readFileInDir(appDir, BACKUP_FILENAME);
  },

  async location(): Promise<string> {
    const handle = await loadDirHandle();
    return handle
      ? `Folder “${handle.name}” / ${APP_DIR_NAME} / ${BACKUP_FILENAME}`
      : "No folder selected";
  },
};

/** Exposed for Settings "forget folder" control. */
export const forgetBackupFolder = clearDirHandle;
