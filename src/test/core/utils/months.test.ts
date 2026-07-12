import { describe, it, expect } from "vitest";
import { abbrevMonth, formatMonthWindow } from "@/core/utils/months.ts";

describe("abbrevMonth", () => {
  it("maps full names to 3-letter abbrevs", () => {
    expect(abbrevMonth("July")).toBe("Jul");
    expect(abbrevMonth("September")).toBe("Sep");
  });
  it("passes through existing abbrevs (case-insensitive)", () => {
    expect(abbrevMonth("jun")).toBe("Jun");
    expect(abbrevMonth("Dec")).toBe("Dec");
  });
  it("returns the input unchanged when unrecognised", () => {
    expect(abbrevMonth("Winter")).toBe("Winter");
  });
});

describe("formatMonthWindow", () => {
  it("returns null for empty / undefined", () => {
    expect(formatMonthWindow(undefined)).toBeNull();
    expect(formatMonthWindow([])).toBeNull();
  });
  it("collapses a contiguous run into a range", () => {
    expect(formatMonthWindow(["May", "June", "July", "August", "September"])).toBe("May–Sep");
  });
  it("handles a single month", () => {
    expect(formatMonthWindow(["December"])).toBe("Dec");
  });
  it("wraps a circular run across the year boundary", () => {
    expect(formatMonthWindow(["November", "December", "January", "February", "March"])).toBe("Nov–Mar");
  });
  it("lists scattered months in calendar order", () => {
    expect(formatMonthWindow(["July", "January", "April"])).toBe("Jan, Apr, Jul");
  });
  it("collapses a near-complete year to Year-round", () => {
    const all = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
    expect(formatMonthWindow(all)).toBe("Year-round");
  });
  it("dedupes and ignores unknown tokens", () => {
    expect(formatMonthWindow(["June", "June", "Bogus"])).toBe("Jun");
  });
});
