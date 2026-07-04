import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getBackupTarget, defaultBackupTargetKind, allBackupTargets } from "../core/platform/selectBackupTarget";
import { downloadBackupTarget } from "../core/adapters/backup/downloadBackupTarget";
import { opfsBackupTarget } from "../core/adapters/backup/opfsBackupTarget";
import { APP_DIR_NAME, BACKUP_FILENAME } from "../core/ports/BackupTargetPort";
import { createFakeDirectory } from "./support/fakeFileSystem";

describe("selectBackupTarget registry", () => {
  it("maps each kind to a target with the matching kind", () => {
    expect(getBackupTarget("filesystem").kind).toBe("filesystem");
    expect(getBackupTarget("opfs").kind).toBe("opfs");
    expect(getBackupTarget("download").kind).toBe("download");
  });

  it("returns a valid default kind for the current environment", () => {
    expect(["filesystem", "opfs", "download"]).toContain(defaultBackupTargetKind());
  });

  it("exposes all three targets for manual switching", () => {
    expect(allBackupTargets().map((t) => t.kind)).toEqual(["filesystem", "opfs", "download"]);
  });
});

describe("downloadBackupTarget", () => {
  it("is ready in a DOM and reports the Downloads folder", async () => {
    expect(await downloadBackupTarget.isReady()).toBe(true);
    expect(await downloadBackupTarget.configure()).toBe(true);
    expect(await downloadBackupTarget.location()).toMatch(/Downloads/i);
  });

  it("writes via an anchor click and cannot read back", async () => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => "blob:test") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
    const clicks: string[] = [];
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { clicks.push(this.download); };
    try {
      const result = await downloadBackupTarget.write("{\"hello\":1}");
      expect(result.ok).toBe(true);
      expect(clicks[0]).toMatch(/^roamwise-backup-\d{4}-\d{2}-\d{2}\.json$/);
    } finally {
      HTMLAnchorElement.prototype.click = orig;
    }
    expect(await downloadBackupTarget.readLatest()).toBeNull();
  });
});

describe("opfsBackupTarget round-trip", () => {
  const realStorage = navigator.storage;
  let root: ReturnType<typeof createFakeDirectory>;

  beforeEach(() => {
    root = createFakeDirectory("opfs-root");
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { getDirectory: vi.fn(async () => root.handle) },
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "storage", { configurable: true, value: realStorage });
  });

  it("writes into a dedicated Roamwise folder under a stable filename", async () => {
    expect(BACKUP_FILENAME).toBe("roamwise-backup-latest.json");
    expect(await opfsBackupTarget.isReady()).toBe(true);
    const write = await opfsBackupTarget.write("{\"v\":42}");
    expect(write.ok).toBe(true);
    expect(write.location).toContain(APP_DIR_NAME);
    expect(root.dirs.has(APP_DIR_NAME)).toBe(true);
  });

  it("reads back the latest backup it wrote", async () => {
    await opfsBackupTarget.write("{\"v\":7}");
    const record = await opfsBackupTarget.readLatest();
    expect(record?.text).toBe("{\"v\":7}");
    expect(record?.savedAt).toBeTypeOf("string");
  });

  it("returns null before any backup has been written (no Roamwise folder yet)", async () => {
    expect(await opfsBackupTarget.readLatest()).toBeNull();
  });

  it("location advertises the Roamwise folder", async () => {
    expect(await opfsBackupTarget.location()).toContain(APP_DIR_NAME);
  });

  it("reports not ready when OPFS is unavailable", async () => {
    Object.defineProperty(navigator, "storage", { configurable: true, value: {} });
    expect(await opfsBackupTarget.isReady()).toBe(false);
    expect(await opfsBackupTarget.readLatest()).toBeNull();
    expect((await opfsBackupTarget.write("x")).ok).toBe(false);
  });
});
