import { describe, it, expect, vi } from "vitest";
import {
  createConsolidatedLoader,
  type ConsolidatedCountry,
  type RuleModuleMap,
} from "@/data/consolidatedLoader";

const DIR = "../../data/rules/";

function fakeCountry(name: string): ConsolidatedCountry {
  return {
    name,
    seed: false,
    lat: 0,
    lng: 0,
    region: "Test",
    bestMonths: [],
    worstMonths: [],
    budget: { solo: "", couple: "", family4: "" },
    experiences: [],
    avoid: [],
    combo: [],
    landmark: null,
    stopoverNote: null,
    links: [],
    cities: [],
    itinerary: { cityImages: { Oslo: ["q"] } } as unknown as ConsolidatedCountry["itinerary"],
  };
}

describe("createConsolidatedLoader — self-healing", () => {
  it("does NOT cache a transient load failure, so a later attempt recovers", async () => {
    // First import rejects (transient), second resolves. Regression: previously a
    // failure was latched as null and the rule stayed broken for the whole session.
    const loader = vi
      .fn<() => Promise<ConsolidatedCountry>>()
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce(fakeCountry("Norway"));
    const modules: RuleModuleMap = { [`${DIR}norway.json`]: loader };
    const store = createConsolidatedLoader(modules, DIR);

    const first = await store.load("Norway");
    expect(first).toBeNull();
    // Not latched — the cache has no negative entry, so getCached is "unknown".
    expect(store.getCached("Norway")).toBeUndefined();

    const second = await store.load("Norway");
    expect(second?.name).toBe("Norway");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("caches a successful load and does not re-import", async () => {
    const loader = vi.fn<() => Promise<ConsolidatedCountry>>().mockResolvedValue(fakeCountry("Japan"));
    const store = createConsolidatedLoader({ [`${DIR}japan.json`]: loader }, DIR);

    await store.load("Japan");
    await store.load("Japan");
    expect(loader).toHaveBeenCalledTimes(1);
    expect(store.getCached("Japan")?.name).toBe("Japan");
  });

  it("dedupes concurrent in-flight loads into a single import", async () => {
    let resolve!: (v: ConsolidatedCountry) => void;
    const loader = vi.fn<() => Promise<ConsolidatedCountry>>(
      () => new Promise((r) => { resolve = r; }),
    );
    const store = createConsolidatedLoader({ [`${DIR}italy.json`]: loader }, DIR);

    const a = store.load("Italy");
    const b = store.load("Italy");
    resolve(fakeCountry("Italy"));
    const [ra, rb] = await Promise.all([a, b]);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(ra?.name).toBe("Italy");
    expect(rb?.name).toBe("Italy");
  });

  it("caches a genuine manifest absence as null (deterministic, no retry churn)", async () => {
    const store = createConsolidatedLoader({}, DIR);
    expect(await store.load("Atlantis")).toBeNull();
    expect(store.getCached("Atlantis")).toBeNull();
  });
});
