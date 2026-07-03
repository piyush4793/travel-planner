import { describe, it, expect } from "vitest";
import { markerClassName, buildMarkerElement, computeHoverPosition } from "../utils/mapMarkers";

describe("mapMarkers", () => {
  describe("markerClassName", () => {
    it("returns the base class when neither visited nor combo", () => {
      expect(markerClassName(false, false)).toBe("travel-marker");
    });
    it("adds the visited modifier", () => {
      expect(markerClassName(true, false)).toBe("travel-marker travel-marker--visited");
    });
    it("adds the combo modifier", () => {
      expect(markerClassName(false, true)).toBe("travel-marker travel-marker--combo");
    });
    it("adds both modifiers in order", () => {
      expect(markerClassName(true, true)).toBe(
        "travel-marker travel-marker--visited travel-marker--combo"
      );
    });
  });

  describe("buildMarkerElement", () => {
    it("renders a single-letter label and accessible button semantics", () => {
      const el = buildMarkerElement("Japan", { isVisited: false, isCombo: false });
      expect(el.tagName).toBe("DIV");
      expect(el.className).toBe("travel-marker");
      expect(el.textContent).toBe("J");
      expect(el.getAttribute("role")).toBe("button");
      expect(el.getAttribute("tabindex")).toBe("0");
      expect(el.getAttribute("aria-label")).toBe("Japan");
      expect(el.querySelector("span")?.textContent).toBe("J");
    });

    it("reflects visited/combo state in the class list", () => {
      const el = buildMarkerElement("Peru", { isVisited: true, isCombo: true });
      expect(el.className).toContain("travel-marker--visited");
      expect(el.className).toContain("travel-marker--combo");
    });

    it("handles an empty name without throwing", () => {
      const el = buildMarkerElement("", { isVisited: false, isCombo: false });
      expect(el.textContent).toBe("");
      expect(el.getAttribute("aria-label")).toBe("");
    });
  });

  describe("computeHoverPosition", () => {
    it("centers horizontally and anchors to the top, relative to container origin", () => {
      const container = { left: 100, top: 50, width: 800 };
      const marker = { left: 340, top: 220, width: 40 };
      expect(computeHoverPosition(container, marker)).toEqual({ x: 260, y: 170 });
    });

    it("returns zero offset when marker sits at the container origin", () => {
      const container = { left: 0, top: 0, width: 500 };
      const marker = { left: 0, top: 0, width: 20 };
      expect(computeHoverPosition(container, marker)).toEqual({ x: 10, y: 0 });
    });
  });
});
