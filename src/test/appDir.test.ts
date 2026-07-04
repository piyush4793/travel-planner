import { describe, it, expect } from "vitest";
import { openAppDir, readFileInDir, writeFileInDir } from "../core/adapters/backup/appDir";
import { APP_DIR_NAME, BACKUP_FILENAME } from "../core/ports/BackupTargetPort";
import { createFakeDirectory } from "./support/fakeFileSystem";

describe("openAppDir", () => {
  it("creates the Roamwise folder when absent (create=true)", async () => {
    const parent = createFakeDirectory("Documents");
    const appDir = await openAppDir(parent.handle, true);
    expect(appDir).not.toBeNull();
    expect(parent.dirs.has(APP_DIR_NAME)).toBe(true);
  });

  it("is idempotent — reuses the existing folder", async () => {
    const parent = createFakeDirectory("Documents");
    await openAppDir(parent.handle, true);
    await openAppDir(parent.handle, true);
    expect(parent.dirs.size).toBe(1);
  });

  it("returns null when the folder is absent and create=false", async () => {
    const parent = createFakeDirectory("Documents");
    expect(await openAppDir(parent.handle, false)).toBeNull();
  });
});

describe("writeFileInDir / readFileInDir", () => {
  it("round-trips text through a stable filename", async () => {
    const dir = createFakeDirectory("Roamwise");
    await writeFileInDir(dir.handle, BACKUP_FILENAME, "{\"a\":1}");
    const record = await readFileInDir(dir.handle, BACKUP_FILENAME);
    expect(record?.text).toBe("{\"a\":1}");
    expect(record?.savedAt).toBeTypeOf("string");
  });

  it("overwrites an existing file", async () => {
    const dir = createFakeDirectory("Roamwise");
    await writeFileInDir(dir.handle, BACKUP_FILENAME, "old");
    await writeFileInDir(dir.handle, BACKUP_FILENAME, "new");
    expect((await readFileInDir(dir.handle, BACKUP_FILENAME))?.text).toBe("new");
  });

  it("returns null when the file does not exist", async () => {
    const dir = createFakeDirectory("Roamwise");
    expect(await readFileInDir(dir.handle, BACKUP_FILENAME)).toBeNull();
  });
});
