import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getFlagImage } from "../utils/flagImage";

describe("flagImage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns null when no canvas context is available (jsdom default)", () => {
    // jsdom does not implement canvas rendering, so getContext yields null.
    expect(getFlagImage("Zimbabwe")).toBeNull();
  });

  describe("with a stubbed canvas", () => {
    let created = 0;
    let dataUrl = "data:image/png;base64,AAAA";

    beforeEach(() => {
      created = 0;
      dataUrl = "data:image/png;base64,AAAA";
      const makeCanvas = () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          font: "", textBaseline: "", textAlign: "",
          measureText: () => ({ width: 120 }),
          clearRect: () => {}, fillText: () => {},
        }),
        toDataURL: () => dataUrl,
      });
      vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
        if (tag === "canvas") { created += 1; return makeCanvas() as unknown as HTMLElement; }
        return document.createElementNS("http://www.w3.org/1999/xhtml", tag) as HTMLElement;
      }) as typeof document.createElement);
    });

    it("rasterises a flag to a PNG data URL with an aspect ratio", () => {
      const flag = getFlagImage("Japan");
      expect(flag).not.toBeNull();
      expect(flag?.dataUrl).toMatch(/^data:image\/png/);
      expect(flag?.aspect).toBeGreaterThan(0);
    });

    it("memoises results so the canvas is only built once per country", () => {
      getFlagImage("Brazil");
      getFlagImage("Brazil");
      expect(created).toBe(1);
    });

    it("returns null when toDataURL does not yield a PNG", () => {
      dataUrl = "data:,";
      expect(getFlagImage("Kenya")).toBeNull();
    });
  });
});

