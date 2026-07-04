import { describe, it, expect, vi, afterEach } from "vitest";
import { loadLS, saveLS, getStorageAdapter, setStorageAdapter } from "../core/storage";
import type { StoragePort } from "../core/ports/StoragePort";

describe("storage — P0", () => {
  it("saveLS + loadLS round-trips a string", () => {
    saveLS("test_key", "hello");
    expect(loadLS("test_key", "")).toBe("hello");
  });

  it("saveLS + loadLS round-trips an object", () => {
    const obj = { name: "Norway", days: 7 };
    saveLS("test_obj", obj);
    expect(loadLS("test_obj", {})).toEqual(obj);
  });

  it("saveLS + loadLS round-trips an array", () => {
    saveLS("test_arr", [1, 2, 3]);
    expect(loadLS("test_arr", [])).toEqual([1, 2, 3]);
  });

  it("loadLS returns fallback when key is missing", () => {
    expect(loadLS("nonexistent", "default")).toBe("default");
  });

  it("loadLS returns fallback on corrupted JSON", () => {
    localStorage.setItem("bad_json", "{invalid");
    expect(loadLS("bad_json", "fallback")).toBe("fallback");
  });

  it("saveLS overwrites existing values", () => {
    saveLS("key", "first");
    saveLS("key", "second");
    expect(loadLS("key", "")).toBe("second");
  });
});

describe("storage — adapter injection & quota handling", () => {
  const original = getStorageAdapter();
  afterEach(() => {
    setStorageAdapter(original);
    vi.restoreAllMocks();
  });

  it("routes reads/writes through a swapped adapter", () => {
    const backing = new Map<string, string>();
    const fake: StoragePort = {
      getItem: (k) => backing.get(k) ?? null,
      setItem: (k, v) => { backing.set(k, v); },
      removeItem: (k) => { backing.delete(k); },
    };
    setStorageAdapter(fake);
    expect(getStorageAdapter()).toBe(fake);

    expect(saveLS("adapter_key", { a: 1 })).toBe(true);
    expect(backing.get("adapter_key")).toBe(JSON.stringify({ a: 1 }));
    expect(loadLS("adapter_key", null)).toEqual({ a: 1 });
  });

  it("returns false and warns when the adapter throws QuotaExceededError", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const quotaAdapter: StoragePort = {
      getItem: () => null,
      setItem: () => { throw new DOMException("full", "QuotaExceededError"); },
      removeItem: () => {},
    };
    setStorageAdapter(quotaAdapter);

    expect(saveLS("big", "x".repeat(10))).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("QuotaExceeded writing key \"big\""));
  });

  it("returns false without warning for non-quota write failures", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failingAdapter: StoragePort = {
      getItem: () => null,
      setItem: () => { throw new Error("disk error"); },
      removeItem: () => {},
    };
    setStorageAdapter(failingAdapter);

    expect(saveLS("k", "v")).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});
