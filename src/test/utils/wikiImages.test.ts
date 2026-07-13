import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function mockJsonResponse(data: unknown, ok = true): Response {
  return {
    ok,
    json: async () => data,
  } as Response;
}

async function importWikiImages() {
  vi.resetModules();
  return import("@/utils/wikiImages.ts");
}

describe("wikiImages — P0", () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn() as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the URL directly when the query starts with http", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const { getWikiImage } = await importWikiImages();

    const image = await getWikiImage("https://images.example/japan.jpg");

    expect(image).toBe("https://images.example/japan.jpg");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null on fetch failure", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const { getWikiImage } = await importWikiImages();

    await expect(getWikiImage("Japan skyline")).resolves.toBeNull();
  });

  it("returns a cached result on the second call", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        query: {
          pages: {
            "1": {
              imageinfo: [
                {
                  mime: "image/jpeg",
                  width: 1200,
                  thumbwidth: 1024,
                  thumburl: "https://images.example/japan-thumb.jpg?download=1",
                  url: "https://images.example/japan.jpg",
                },
              ],
            },
          },
        },
      }),
    );

    const { getWikiImage } = await importWikiImages();

    const first = await getWikiImage("Japan skyline");
    const second = await getWikiImage("Japan skyline");

    expect(first).toBe("https://images.example/japan-thumb.jpg");
    expect(second).toBe("https://images.example/japan-thumb.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("filters out SVG results and keeps jpeg/png/webp images", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        query: {
          pages: {
            "1": {
              imageinfo: [
                {
                  mime: "image/svg+xml",
                  width: 1600,
                  thumbwidth: 1024,
                  thumburl: "https://images.example/map.svg",
                  url: "https://images.example/map.svg",
                },
              ],
            },
            "2": {
              imageinfo: [
                {
                  mime: "image/webp",
                  width: 1400,
                  thumbwidth: 1024,
                  thumburl: "https://images.example/photo.webp?foo=bar",
                  url: "https://images.example/photo-original.webp",
                },
              ],
            },
          },
        },
      }),
    );

    const { getWikiImage } = await importWikiImages();
    const image = await getWikiImage("South Korea skyline");

    expect(image).toBe("https://images.example/photo.webp");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and succeeds on second attempt", async () => {
    vi.useFakeTimers();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 429 } as Response)
      .mockResolvedValueOnce(
        mockJsonResponse({
          query: {
            pages: {
              "1": {
                imageinfo: [
                  {
                    mime: "image/jpeg",
                    width: 1200,
                    thumbwidth: 1024,
                    thumburl: "https://images.example/retry-thumb.jpg",
                    url: "https://images.example/retry.jpg",
                  },
                ],
              },
            },
          },
        }),
      );

    const { getWikiImage } = await importWikiImages();
    const promise = getWikiImage("Retry test");
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result).toBe("https://images.example/retry-thumb.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("does not cache 429 failures so next render can retry", async () => {
    vi.useFakeTimers();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({ ok: false, status: 429 } as Response);

    const { getWikiImage } = await importWikiImages();
    const promise = getWikiImage("Throttled query");
    await vi.advanceTimersByTimeAsync(5000);
    const first = await promise;
    expect(first).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        query: {
          pages: {
            "1": {
              imageinfo: [
                {
                  mime: "image/jpeg",
                  width: 800,
                  thumbwidth: 1024,
                  thumburl: "https://images.example/recovered.jpg",
                  url: "https://images.example/recovered.jpg",
                },
              ],
            },
          },
        },
      }),
    );
    const second = await getWikiImage("Throttled query");
    expect(second).toBe("https://images.example/recovered.jpg");
    vi.useRealTimers();
  });

  it("does not cache a non-429 failure so a later attempt can recover", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    // A transient 503 must NOT poison the session cache — the same query later
    // succeeds and returns the image (regression: previously null was latched).
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 } as Response);

    const { getWikiImage } = await importWikiImages();
    const first = await getWikiImage("Flaky query");
    expect(first).toBeNull();

    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        query: {
          pages: {
            "1": {
              imageinfo: [
                {
                  mime: "image/jpeg",
                  width: 1200,
                  thumbwidth: 1024,
                  thumburl: "https://images.example/recovered-503.jpg",
                  url: "https://images.example/recovered-503.jpg",
                },
              ],
            },
          },
        },
      }),
    );
    const second = await getWikiImage("Flaky query");
    expect(second).toBe("https://images.example/recovered-503.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache an empty (no suitable image) result so a later attempt can recover", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    // A search that momentarily returns only SVGs/tiny images yields null but is
    // not cached, so a later search that returns a photo still populates.
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        query: {
          pages: {
            "1": {
              imageinfo: [{ mime: "image/svg+xml", width: 1600, url: "https://images.example/map.svg" }],
            },
          },
        },
      }),
    );

    const { getWikiImage } = await importWikiImages();
    const first = await getWikiImage("Sparse query");
    expect(first).toBeNull();

    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        query: {
          pages: {
            "1": {
              imageinfo: [
                {
                  mime: "image/jpeg",
                  width: 1200,
                  thumbwidth: 1024,
                  thumburl: "https://images.example/recovered-empty.jpg",
                  url: "https://images.example/recovered-empty.jpg",
                },
              ],
            },
          },
        },
      }),
    );
    const second = await getWikiImage("Sparse query");
    expect(second).toBe("https://images.example/recovered-empty.jpg");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
