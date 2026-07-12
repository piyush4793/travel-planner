import { describe, it, expect } from "vitest";
import { VEHICLE_SVG, TRANSPORT_COLORS, buildVehicleSvgNode } from "@/utils/vehicleMarkers.ts";

describe("vehicleMarkers", () => {
  it("every VEHICLE_SVG asset is well-formed XML that parses to an <svg>", () => {
    for (const [emoji, markup] of Object.entries(VEHICLE_SVG)) {
      const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
      expect(doc.querySelector("parsererror"), `parse error for ${emoji}`).toBeNull();
      expect(doc.querySelector("svg"), `no <svg> for ${emoji}`).not.toBeNull();
    }
  });

  it("buildVehicleSvgNode returns a live, sized <svg> node for known markup", () => {
    const node = buildVehicleSvgNode(VEHICLE_SVG["✈️"]);
    expect(node).not.toBeNull();
    expect(node?.tagName.toLowerCase()).toBe("svg");
    expect(node?.style.width).toBe("100%");
    expect(node?.style.height).toBe("100%");
    expect(node?.style.display).toBe("block");
  });

  it("clones a fresh node per call (no shared DOM instance across markers)", () => {
    const a = buildVehicleSvgNode(VEHICLE_SVG["🚗"]);
    const b = buildVehicleSvgNode(VEHICLE_SVG["🚗"]);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a).not.toBe(b);
  });

  it("returns null for missing markup so callers can fall back to an emoji", () => {
    expect(buildVehicleSvgNode(undefined)).toBeNull();
    expect(buildVehicleSvgNode("")).toBeNull();
    expect(buildVehicleSvgNode(VEHICLE_SVG["🛸"])).toBeNull();
  });

  it("returns null for malformed markup instead of throwing", () => {
    expect(buildVehicleSvgNode("<svg><unclosed></svg")).toBeNull();
    expect(buildVehicleSvgNode("not svg at all")).toBeNull();
  });

  it("exposes trail/glow colors for all transport emojis", () => {
    for (const emoji of ["✈️", "🚗", "🚂", "🚌", "⛴️", "🚡"]) {
      expect(TRANSPORT_COLORS[emoji]).toHaveProperty("trail");
      expect(TRANSPORT_COLORS[emoji]).toHaveProperty("glow");
    }
  });
});
