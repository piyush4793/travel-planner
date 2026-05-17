import { describe, it, expect } from "vitest";
import { loadLS, saveLS } from "../utils/storage";

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
