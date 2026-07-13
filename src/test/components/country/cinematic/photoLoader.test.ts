import { describe, it, expect, vi } from "vitest";
import { loadCityPhotos } from "@/components/country/cinematic/photoLoader";

const instant = () => Promise.resolve();

describe("loadCityPhotos", () => {
  it("returns only cities that resolved at least one valid photo", async () => {
    const getImage = vi.fn(async (q: string) => (q.includes("miss") ? null : `url:${q}`));
    const result = await loadCityPhotos(
      { Tokyo: ["Shibuya", "Skytree"], Ghost: ["miss1", "miss2"] },
      getImage,
      { sleep: instant },
    );
    expect(result).toEqual({ Tokyo: ["url:Shibuya", "url:Skytree"] });
    expect(result.Ghost).toBeUndefined();
  });

  it("drops null/failed lookups but keeps the surviving ones", async () => {
    const getImage = vi.fn(async (q: string) => {
      if (q === "boom") throw new Error("network");
      if (q === "null") return null;
      return `url:${q}`;
    });
    const result = await loadCityPhotos({ Kyoto: ["boom", "null", "Fushimi"] }, getImage, { sleep: instant });
    expect(result).toEqual({ Kyoto: ["url:Fushimi"] });
  });

  it("returns whatever settled before the cap fires (timeout wins)", async () => {
    // getImage never resolves; the injected cap resolves immediately, so we get {}.
    const getImage = vi.fn(() => new Promise<string | null>(() => {}));
    const result = await loadCityPhotos({ Osaka: ["slow"] }, getImage, {
      capMs: 1,
      sleep: () => Promise.resolve(),
    });
    expect(result).toEqual({});
  });

  it("handles an empty city map", async () => {
    const getImage = vi.fn(async () => "x");
    const result = await loadCityPhotos({}, getImage, { sleep: instant });
    expect(result).toEqual({});
    expect(getImage).not.toHaveBeenCalled();
  });

  it("fetches every article across all cities", async () => {
    const getImage = vi.fn(async (q: string) => `url:${q}`);
    await loadCityPhotos({ A: ["a1", "a2"], B: ["b1"] }, getImage, { sleep: instant });
    expect(getImage).toHaveBeenCalledTimes(3);
  });
});
