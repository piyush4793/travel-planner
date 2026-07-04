import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createFakeDirectory } from "./support/fakeFileSystem";
import { APP_DIR_NAME, BACKUP_FILENAME } from "../core/ports/BackupTargetPort";

const store = vi.hoisted(() => ({ handle: null as FileSystemDirectoryHandle | null }));

vi.mock("../core/adapters/backup/handleStore", () => ({
  loadDirHandle: async () => store.handle,
  saveDirHandle: async (h: FileSystemDirectoryHandle) => { store.handle = h; },
  clearDirHandle: async () => { store.handle = null; },
}));

import { fileSystemBackupTarget, forgetBackupFolder } from "../core/adapters/backup/fileSystemBackupTarget";

function setPicker(fn: unknown) {
  Object.defineProperty(window, "showDirectoryPicker", { configurable: true, writable: true, value: fn });
}

describe("fileSystemBackupTarget", () => {
  beforeEach(() => { store.handle = null; });
  afterEach(() => {
    delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
    vi.restoreAllMocks();
  });

  describe("isReady", () => {
    it("is false when no folder has been chosen", async () => {
      expect(await fileSystemBackupTarget.isReady()).toBe(false);
    });

    it("is true once a granted folder is stored", async () => {
      store.handle = createFakeDirectory("Backups", "granted").handle;
      expect(await fileSystemBackupTarget.isReady()).toBe(true);
    });

    it("is false when the stored folder's permission was revoked", async () => {
      store.handle = createFakeDirectory("Backups", "denied").handle;
      expect(await fileSystemBackupTarget.isReady()).toBe(false);
    });
  });

  describe("configure", () => {
    it("stores a folder and grants permission", async () => {
      const dir = createFakeDirectory("Chosen", "granted");
      setPicker(vi.fn(async () => dir.handle));
      expect(await fileSystemBackupTarget.configure()).toBe(true);
      expect(store.handle).toBe(dir.handle);
    });

    it("requests permission when the folder is in a prompt state", async () => {
      const dir = createFakeDirectory("Chosen", "prompt");
      setPicker(vi.fn(async () => dir.handle));
      expect(await fileSystemBackupTarget.configure()).toBe(true);
      expect(dir.permissionRequests).toBe(1);
    });

    it("fails when permission is denied", async () => {
      const dir = createFakeDirectory("Chosen", "denied");
      setPicker(vi.fn(async () => dir.handle));
      expect(await fileSystemBackupTarget.configure()).toBe(false);
      expect(store.handle).toBeNull();
    });

    it("returns false when the user cancels the picker", async () => {
      setPicker(vi.fn(async () => { throw new DOMException("aborted", "AbortError"); }));
      expect(await fileSystemBackupTarget.configure()).toBe(false);
    });

    it("returns false when the picker API is unavailable", async () => {
      expect(await fileSystemBackupTarget.configure()).toBe(false);
    });
  });

  describe("write", () => {
    it("fails with no-folder when nothing is configured", async () => {
      const result = await fileSystemBackupTarget.write("{}");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("no-folder");
    });

    it("writes into a dedicated Roamwise folder", async () => {
      const dir = createFakeDirectory("Backups", "granted");
      store.handle = dir.handle;
      const result = await fileSystemBackupTarget.write("{\"n\":1}");
      expect(result.ok).toBe(true);
      expect(result.location).toBe(`Backups/${APP_DIR_NAME}`);
      expect(dir.dirs.get(APP_DIR_NAME)?.files.get(BACKUP_FILENAME)?.text).toBe("{\"n\":1}");
    });
  });

  describe("readLatest", () => {
    it("returns null before any backup exists", async () => {
      store.handle = createFakeDirectory("Backups", "granted").handle;
      expect(await fileSystemBackupTarget.readLatest()).toBeNull();
    });

    it("reads back what write stored", async () => {
      store.handle = createFakeDirectory("Backups", "granted").handle;
      await fileSystemBackupTarget.write("{\"n\":9}");
      expect((await fileSystemBackupTarget.readLatest())?.text).toBe("{\"n\":9}");
    });

    it("returns null when permission is not granted", async () => {
      store.handle = createFakeDirectory("Backups", "denied").handle;
      expect(await fileSystemBackupTarget.readLatest()).toBeNull();
    });
  });

  describe("location", () => {
    it("names the folder and Roamwise path when configured", async () => {
      store.handle = createFakeDirectory("Travel", "granted").handle;
      expect(await fileSystemBackupTarget.location()).toContain(`Travel`);
      expect(await fileSystemBackupTarget.location()).toContain(APP_DIR_NAME);
    });

    it("reports no folder when unconfigured", async () => {
      expect(await fileSystemBackupTarget.location()).toBe("No folder selected");
    });
  });

  it("forgetBackupFolder clears the stored handle", async () => {
    store.handle = createFakeDirectory("Backups", "granted").handle;
    await forgetBackupFolder();
    expect(store.handle).toBeNull();
    expect(await fileSystemBackupTarget.isReady()).toBe(false);
  });
});
