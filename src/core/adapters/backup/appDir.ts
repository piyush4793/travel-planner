import type { BackupRecord } from "../../ports/BackupTargetPort";
import { APP_DIR_NAME } from "../../ports/BackupTargetPort";

/**
 * Shared File System Access helpers used by both the folder and OPFS targets.
 * Keeps the "dedicated Roamwise app folder" + read/write logic in one place (DRY),
 * so every persistent target stores its data the same, findable way.
 */

/** Get (or create) the dedicated Roamwise app folder inside a parent directory. */
export async function openAppDir(
  parent: FileSystemDirectoryHandle,
  create: boolean,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await parent.getDirectoryHandle(APP_DIR_NAME, { create });
  } catch {
    return null; // absent (create=false) or not permitted
  }
}

/** Overwrite a file inside a directory with the given text. */
export async function writeFileInDir(
  dir: FileSystemDirectoryHandle,
  name: string,
  text: string,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

/** Read a file inside a directory into a BackupRecord, or null if it is absent. */
export async function readFileInDir(
  dir: FileSystemDirectoryHandle,
  name: string,
): Promise<BackupRecord | null> {
  try {
    const fileHandle = await dir.getFileHandle(name);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return { text, savedAt: file.lastModified ? new Date(file.lastModified).toISOString() : null };
  } catch {
    return null; // file not present yet
  }
}
