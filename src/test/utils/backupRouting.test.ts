import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasAnyLocalData,
  getBackupTargetKind,
  setBackupTargetKind,
  backupToTarget,
  autoBackupToTargetIfOverdue,
  restoreFromTarget,
  canAutoImport,
} from "@/utils/backup.ts";
import { LS_KEYS } from "@/core/lsKeys.ts";
import { APP_DIR_NAME } from "@/core/ports/BackupTargetPort.ts";
import { createFakeDirectory } from "@/test/support/fakeFileSystem.ts";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("hasAnyLocalData", () => {
  it("is false with an empty store", () => {
    expect(hasAnyLocalData()).toBe(false);
  });

  it("is true when My List has entries", () => {
    localStorage.setItem(LS_KEYS.MY_LIST, JSON.stringify(["Japan"]));
    expect(hasAnyLocalData()).toBe(true);
  });

  it("is true when AI plans exist", () => {
    localStorage.setItem(LS_KEYS.AI_PLANS, JSON.stringify({ Japan: [{}] }));
    expect(hasAnyLocalData()).toBe(true);
  });
});

describe("getBackupTargetKind override", () => {
  it("falls back to a platform default when unset", () => {
    expect(["filesystem", "opfs", "download"]).toContain(getBackupTargetKind());
  });

  it("honours a stored override", () => {
    setBackupTargetKind("download");
    expect(getBackupTargetKind()).toBe("download");
  });

  it("ignores a garbage override value", () => {
    localStorage.setItem(LS_KEYS.BACKUP_TARGET, JSON.stringify("nonsense"));
    expect(["filesystem", "opfs", "download"]).toContain(getBackupTargetKind());
  });
});

describe("backupToTarget via download target", () => {
  it("writes and records the last-backup timestamp", async () => {
    setBackupTargetKind("download");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => "blob:test") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {};
    try {
      const result = await backupToTarget();
      expect(result.ok).toBe(true);
      expect(localStorage.getItem(LS_KEYS.LAST_BACKUP)).toBeTruthy();
    } finally {
      HTMLAnchorElement.prototype.click = orig;
    }
  });
});

describe("restoreFromTarget", () => {
  it("reports no backup for a target that cannot read back", async () => {
    setBackupTargetKind("download");
    const result = await restoreFromTarget();
    expect(result.ok).toBe(false);
  });

  it("reports a parse error when the stored backup is not valid JSON", async () => {
    setBackupTargetKind("opfs");
    const realStorage = navigator.storage;
    const root = createFakeDirectory("opfs-root");
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { getDirectory: vi.fn(async () => root.handle), persist: vi.fn(async () => true) },
    });
    try {
      const appDir = await root.handle.getDirectoryHandle(APP_DIR_NAME, { create: true });
      const file = await appDir.getFileHandle("roamwise-backup-latest.json", { create: true });
      const writable = await file.createWritable();
      await writable.write("{ not json");
      await writable.close();

      const result = await restoreFromTarget();
      expect(result.ok).toBe(false);
      expect(result.msg).toMatch(/could not be parsed/i);
    } finally {
      Object.defineProperty(navigator, "storage", { configurable: true, value: realStorage });
    }
  });
});

describe("autoBackupToTargetIfOverdue", () => {
  it("does nothing when a backup is not overdue", async () => {
    setBackupTargetKind("download");
    localStorage.setItem(LS_KEYS.LAST_BACKUP, JSON.stringify(new Date().toISOString()));
    expect(await autoBackupToTargetIfOverdue()).toBe(false);
  });

  it("backs up when overdue and records a fresh timestamp", async () => {
    setBackupTargetKind("download");
    const stale = new Date(Date.now() - 40 * 86400000).toISOString();
    localStorage.setItem(LS_KEYS.LAST_BACKUP, JSON.stringify(stale));
    const before = localStorage.getItem(LS_KEYS.LAST_BACKUP);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => "blob:test") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {};
    try {
      expect(await autoBackupToTargetIfOverdue()).toBe(true);
      expect(localStorage.getItem(LS_KEYS.LAST_BACKUP)).not.toBe(before);
    } finally {
      HTMLAnchorElement.prototype.click = orig;
    }
  });
});

describe("target-routed backup + restore via OPFS", () => {
  const realStorage = navigator.storage;
  let root: ReturnType<typeof createFakeDirectory>;

  beforeEach(() => {
    setBackupTargetKind("opfs");
    root = createFakeDirectory("opfs-root");
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { getDirectory: vi.fn(async () => root.handle), persist: vi.fn(async () => true) },
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "storage", { configurable: true, value: realStorage });
  });

  it("writes to the Roamwise folder and records the timestamp", async () => {
    localStorage.setItem(LS_KEYS.MY_LIST, JSON.stringify(["Japan"]));
    const result = await backupToTarget();
    expect(result.ok).toBe(true);
    expect(result.location).toContain(APP_DIR_NAME);
    expect(localStorage.getItem(LS_KEYS.LAST_BACKUP)).toBeTruthy();
  });

  it("round-trips: a backed-up list can be restored after being cleared", async () => {
    localStorage.setItem(LS_KEYS.MY_LIST, JSON.stringify(["Japan", "Peru"]));
    await backupToTarget();
    localStorage.removeItem(LS_KEYS.MY_LIST);

    const result = await restoreFromTarget();
    expect(result.ok).toBe(true);
    expect(JSON.parse(localStorage.getItem(LS_KEYS.MY_LIST)!)).toEqual(["Japan", "Peru"]);
  });

  it("canAutoImport is false before a backup and true after", async () => {
    expect(await canAutoImport()).toBe(false);
    localStorage.setItem(LS_KEYS.MY_LIST, JSON.stringify(["Japan"]));
    await backupToTarget();
    expect(await canAutoImport()).toBe(true);
  });

  it("falls back to a download when the target write fails", async () => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {
        getDirectory: vi.fn(async () => { throw new Error("blocked"); }),
        persist: vi.fn(async () => true),
      },
    });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => "blob:x") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {};
    try {
      const result = await backupToTarget();
      expect(result.ok).toBe(true);
      expect(result.location).toBe("Downloads");
    } finally {
      HTMLAnchorElement.prototype.click = orig;
    }
  });
});

describe("canAutoImport on a non-readable target", () => {
  it("is false for the download target", async () => {
    setBackupTargetKind("download");
    expect(await canAutoImport()).toBe(false);
  });
});
