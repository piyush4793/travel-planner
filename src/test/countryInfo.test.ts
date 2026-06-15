import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function mockJsonResponse(data: unknown, ok = true): Response {
  return {
    ok,
    json: async () => data,
  } as Response;
}

async function importCountryInfo() {
  vi.resetModules();
  return import("../utils/countryInfo");
}

describe("countryInfo — P0", () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn() as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the Wikipedia API with the correct URL and returns parsed info", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const longSummary = [
      "Japan is an island country in East Asia with a rich cultural heritage and modern cities.",
      "It is known for temples, cuisine, efficient rail travel, and seasonal landscapes.",
      "Travelers often combine Tokyo, Kyoto, Osaka, and smaller towns for a balanced trip.",
      "The country offers a deep mix of history, food, nature, and contemporary design.",
    ].join(" ");

    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({
          extract: longSummary,
          wikibase_item: "Q17",
          thumbnail: { source: "https://images.example/japan.jpg" },
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          entities: {
            Q17: {
              claims: {
                P36: [{ mainsnak: { datavalue: { value: { id: "Q1490" } } } }],
                P38: [{ mainsnak: { datavalue: { value: { id: "Q8142" } } } }],
                P37: [{ mainsnak: { datavalue: { value: { id: "Q5287" } } } }],
              },
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          entities: {
            Q1490: { labels: { en: { value: "Tokyo" } } },
            Q8142: { labels: { en: { value: "Japanese yen" } } },
            Q5287: { labels: { en: { value: "Japanese" } } },
          },
        }),
      );

    const { fetchCountryInfo } = await importCountryInfo();
    const info = await fetchCountryInfo("Japan");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://en.wikipedia.org/api/rest_v1/page/summary/Japan",
      { headers: { "Api-User-Agent": "Roamwise/1.0" } },
    );
    expect(info).toMatchObject({
      capital: "Tokyo",
      currency: "Japanese yen",
      language: "Japanese",
      thumbnail: "https://images.example/japan.jpg",
    });
    expect(info?.summary).toBeTruthy();
    expect(info?.summary).not.toBe(longSummary);
    expect(info?.summary.length).toBeLessThanOrEqual(300);
  });

  it("returns null on fetch failure", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const { fetchCountryInfo } = await importCountryInfo();

    await expect(fetchCountryInfo("Japan")).resolves.toBeNull();
  });

  it("caches results so the second call does not fetch again", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        extract: "Japan summary",
        thumbnail: { source: "https://images.example/japan.jpg" },
      }),
    );

    const { fetchCountryInfo } = await importCountryInfo();

    const first = await fetchCountryInfo("Japan");
    const second = await fetchCountryInfo("Japan");

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
