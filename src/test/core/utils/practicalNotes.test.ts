import { describe, it, expect } from "vitest";
import { parseNoteItems } from "@/core/utils/practicalNotes.ts";

describe("parseNoteItems", () => {
  it("returns a single unlabelled item when there are no segments", () => {
    const items = parseNoteItems("Prices exclude international flights.");
    expect(items).toEqual([{ icon: "📝", label: "", value: "Prices exclude international flights." }]);
  });

  it("categorises route segments (arrow + colon) as Route", () => {
    const [item] = parseNoteItems("Oslo → Bergen: train (7 hrs) | SIM: Telia");
    expect(item).toMatchObject({ label: "Route", value: "Oslo → Bergen: train (7 hrs)" });
  });

  it("strips the SIM prefix from the value", () => {
    const items = parseNoteItems("A → B: x | SIM: Telenor at the airport");
    expect(items[1]).toMatchObject({ label: "SIM", value: "Telenor at the airport" });
  });

  it("maps 'Extras:' segments to Tips and strips the prefix", () => {
    const items = parseNoteItems("A → B: x | Extras: Trolltunga hike");
    expect(items[1]).toMatchObject({ label: "Tips", value: "Trolltunga hike" });
  });

  it("labels middot-separated segments as Apps", () => {
    const items = parseNoteItems("A → B: x | Entur · Yr · Vy");
    expect(items[1]).toMatchObject({ label: "Apps", value: "Entur · Yr · Vy" });
  });

  it("labels best-time phrasing as Timing", () => {
    const items = parseNoteItems("A → B: x | Best time to visit is June");
    expect(items[1]).toMatchObject({ label: "Timing" });
  });

  it("falls back to a generic Note label for unmatched segments", () => {
    const items = parseNoteItems("A → B: x | Carry cash for rural stops");
    expect(items[1]).toMatchObject({ label: "Note", value: "Carry cash for rural stops" });
  });
});
