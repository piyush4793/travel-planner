import { describe, it, expect } from "vitest";
import { detectTransport, TRANSPORT_EMOJI } from "../core/utils/transport";
import { MONTHS, expandMonth } from "../core/utils/months";

describe("transport — P1", () => {
  it("detects flight", () => {
    expect(detectTransport("flight from Oslo")).toBe("flight");
    expect(detectTransport("Fly to Bergen")).toBe("flight");
  });

  it("detects train", () => {
    expect(detectTransport("scenic rail journey")).toBe("train");
    expect(detectTransport("Train to Flam")).toBe("train");
  });

  it("detects ferry", () => {
    expect(detectTransport("fjord ferry")).toBe("ferry");
    expect(detectTransport("cruise along coast")).toBe("ferry");
    expect(detectTransport("boat ride")).toBe("ferry");
  });

  it("detects bus", () => {
    expect(detectTransport("bus to Voss")).toBe("bus");
    expect(detectTransport("airport shuttle")).toBe("bus");
    expect(detectTransport("express service")).toBe("bus");
  });

  it("detects cable car", () => {
    expect(detectTransport("cable car up the mountain")).toBe("cable-car");
  });

  it("defaults to drive", () => {
    expect(detectTransport("rent a car")).toBe("drive");
    expect(detectTransport("unknown transport")).toBe("drive");
  });

  it("has emoji for every transport type", () => {
    const types = ["flight", "train", "ferry", "bus", "cable-car", "drive"] as const;
    types.forEach((t) => {
      expect(TRANSPORT_EMOJI[t]).toBeTruthy();
    });
  });
});

describe("months — P1", () => {
  it("has exactly 12 months", () => {
    expect(MONTHS).toHaveLength(12);
  });

  it("starts with Jan and ends with Dec", () => {
    expect(MONTHS[0]).toBe("Jan");
    expect(MONTHS[11]).toBe("Dec");
  });

  it("expandMonth converts abbreviations to full names", () => {
    expect(expandMonth("Jan")).toBe("January");
    expect(expandMonth("Jun")).toBe("June");
    expect(expandMonth("Dec")).toBe("December");
  });

  it("expandMonth returns input for unknown abbreviations", () => {
    expect(expandMonth("Xyz")).toBe("Xyz");
  });
});
