import { describe, it, expect, vi } from "vitest";
import {
  SCHEMA_VERSION,
  readStoredVersion,
  applyMigrations,
  runMigrations,
  type Migration,
} from "@/core/migrations.ts";
import { LS_KEYS } from "@/core/lsKeys.ts";
import type { StoragePort } from "@/core/ports/StoragePort.ts";

function fakeStorage(seed: Record<string, string> = {}): StoragePort & { map: Map<string, string> } {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe("migrations — readStoredVersion", () => {
  it("returns 0 when no version has been stamped", () => {
    expect(readStoredVersion(fakeStorage())).toBe(0);
  });

  it("parses a valid stamped integer version", () => {
    expect(readStoredVersion(fakeStorage({ [LS_KEYS.SCHEMA_VERSION]: "3" }))).toBe(3);
  });

  it("falls back to 0 on non-numeric or negative values", () => {
    expect(readStoredVersion(fakeStorage({ [LS_KEYS.SCHEMA_VERSION]: "abc" }))).toBe(0);
    expect(readStoredVersion(fakeStorage({ [LS_KEYS.SCHEMA_VERSION]: "-2" }))).toBe(0);
    expect(readStoredVersion(fakeStorage({ [LS_KEYS.SCHEMA_VERSION]: "1.5" }))).toBe(0);
  });
});

describe("migrations — applyMigrations", () => {
  it("applies only migrations newer than the stored version, in ascending order", () => {
    const order: number[] = [];
    const migs: Migration[] = [
      { version: 3, description: "third", migrate: () => order.push(3) },
      { version: 1, description: "first", migrate: () => order.push(1) },
      { version: 2, description: "second", migrate: () => order.push(2) },
    ];
    const result = applyMigrations(1, migs, fakeStorage());
    expect(order).toEqual([2, 3]);
    expect(result).toBe(3);
  });

  it("is a no-op when the stored version is already current", () => {
    const migrate = vi.fn();
    const migs: Migration[] = [{ version: 2, description: "x", migrate }];
    expect(applyMigrations(2, migs, fakeStorage())).toBe(2);
    expect(migrate).not.toHaveBeenCalled();
  });

  it("runs a migration that transforms persisted data", () => {
    const storage = fakeStorage({ [LS_KEYS.MY_LIST]: JSON.stringify(["Norway"]) });
    const migs: Migration[] = [
      {
        version: 1,
        description: "append Sweden",
        migrate: (s) => {
          const list = JSON.parse(s.getItem(LS_KEYS.MY_LIST) ?? "[]") as string[];
          s.setItem(LS_KEYS.MY_LIST, JSON.stringify([...list, "Sweden"]));
        },
      },
    ];
    applyMigrations(0, migs, storage);
    expect(JSON.parse(storage.getItem(LS_KEYS.MY_LIST)!)).toEqual(["Norway", "Sweden"]);
  });
});

describe("migrations — runMigrations", () => {
  it("stamps the current schema version on a fresh store", () => {
    const storage = fakeStorage();
    runMigrations(storage);
    expect(storage.getItem(LS_KEYS.SCHEMA_VERSION)).toBe(String(SCHEMA_VERSION));
  });

  it("stamps pre-versioning data (existing data, no version) as the baseline version", () => {
    const storage = fakeStorage({ [LS_KEYS.MY_LIST]: JSON.stringify(["Japan"]) });
    runMigrations(storage);
    expect(storage.getItem(LS_KEYS.SCHEMA_VERSION)).toBe(String(SCHEMA_VERSION));
    // Baseline stamping must not touch existing data.
    expect(JSON.parse(storage.getItem(LS_KEYS.MY_LIST)!)).toEqual(["Japan"]);
  });

  it("does not rewrite the version when already current", () => {
    const storage = fakeStorage({ [LS_KEYS.SCHEMA_VERSION]: String(SCHEMA_VERSION) });
    const setItem = vi.spyOn(storage, "setItem");
    runMigrations(storage);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("never throws when the storage adapter fails", () => {
    const storage = fakeStorage();
    vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new Error("boom");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => runMigrations(storage)).not.toThrow();
    warn.mockRestore();
  });
});
