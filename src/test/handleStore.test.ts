import { describe, it, expect, afterEach } from "vitest";
import { loadDirHandle, clearDirHandle, saveDirHandle } from "../core/adapters/backup/handleStore";

/**
 * jsdom has no IndexedDB, so these exercise the graceful-degradation branches:
 * loads resolve to null and clears never throw when persistence is unavailable.
 */
describe("handleStore without IndexedDB", () => {
  const had = "indexedDB" in globalThis;
  const original = (globalThis as unknown as { indexedDB?: unknown }).indexedDB;

  afterEach(() => {
    if (had) Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: original });
  });

  it("loadDirHandle resolves to null", async () => {
    expect(await loadDirHandle()).toBeNull();
  });

  it("clearDirHandle resolves without throwing", async () => {
    await expect(clearDirHandle()).resolves.toBeUndefined();
  });

  it("saveDirHandle rejects when persistence is unavailable", async () => {
    await expect(saveDirHandle({} as FileSystemDirectoryHandle)).rejects.toBeTruthy();
  });
});

/**
 * Exercises the happy paths (open → upgrade → get/put/delete) with a minimal
 * in-memory IndexedDB fake, since jsdom ships none.
 */
function installFakeIndexedDB(): void {
  const stores = new Map<string, Map<unknown, unknown>>();
  const db = {
    objectStoreNames: { contains: (n: string) => stores.has(n) },
    createObjectStore: (n: string) => { stores.set(n, new Map()); return {}; },
    transaction: () => ({
      objectStore: (n: string) => {
        const map = stores.get(n)!;
        const run = <T>(fn: () => T) => {
          const req = {} as { result?: T; onsuccess?: () => void; onerror?: () => void };
          queueMicrotask(() => { req.result = fn(); req.onsuccess?.(); });
          return req;
        };
        return {
          put: (val: unknown, key: unknown) => run(() => { map.set(key, val); }),
          get: (key: unknown) => run(() => map.get(key)),
          delete: (key: unknown) => run(() => { map.delete(key); }),
        };
      },
    }),
  };
  const fake = {
    open: () => {
      const req = {} as { result?: unknown; onupgradeneeded?: () => void; onsuccess?: () => void; onerror?: () => void };
      queueMicrotask(() => { req.result = db; req.onupgradeneeded?.(); req.onsuccess?.(); });
      return req;
    },
  };
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: fake });
}

describe("handleStore with IndexedDB", () => {
  const original = (globalThis as unknown as { indexedDB?: unknown }).indexedDB;
  afterEach(() => {
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: original });
  });

  it("round-trips a handle through save → load", async () => {
    installFakeIndexedDB();
    const handle = { name: "dir" } as unknown as FileSystemDirectoryHandle;
    await saveDirHandle(handle);
    expect(await loadDirHandle()).toBe(handle);
  });

  it("clears a stored handle", async () => {
    installFakeIndexedDB();
    const handle = { name: "dir" } as unknown as FileSystemDirectoryHandle;
    await saveDirHandle(handle);
    await clearDirHandle();
    expect(await loadDirHandle()).toBeNull();
  });
});
