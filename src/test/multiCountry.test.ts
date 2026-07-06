import { describe, it, expect } from "vitest";
import { MAX_TRIP_UNITS, toggleTripSelection } from "../core/utils/multiCountry";

describe("toggleTripSelection", () => {
  it("appends a new country in pick order", () => {
    expect(toggleTripSelection(["Japan"], "Peru")).toEqual(["Japan", "Peru"]);
  });

  it("removes an already-selected country, preserving the rest", () => {
    expect(toggleTripSelection(["Japan", "Peru", "Chile"], "Peru")).toEqual(["Japan", "Chile"]);
  });

  it("ignores appends once the cap is reached", () => {
    const full = ["A", "B"];
    expect(toggleTripSelection(full, "C", 2)).toEqual(["A", "B"]);
  });

  it("still allows removal at the cap", () => {
    expect(toggleTripSelection(["A", "B"], "A", 2)).toEqual(["B"]);
  });

  it("never mutates the input", () => {
    const input = ["A"];
    toggleTripSelection(input, "B");
    expect(input).toEqual(["A"]);
  });

  it("defaults to the shared max", () => {
    const full = Array.from({ length: MAX_TRIP_UNITS }, (_, i) => `C${i}`);
    expect(toggleTripSelection(full, "extra")).toEqual(full);
  });
});
