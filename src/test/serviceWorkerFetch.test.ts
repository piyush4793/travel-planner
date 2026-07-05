import { describe, it, expect, beforeEach, vi } from "vitest";
import swSource from "../../public/sw.js?raw";

// Harness that loads the real public/sw.js into a mocked ServiceWorker global
// scope so we can regression-test the caching strategy — the exact surface
// where "stale data" and "Failed to convert value to 'Response'" bugs live.
// sw.js is a classic script (no imports/exports), so we run it with injected
// globals as function parameters.

const ORIGIN = "http://localhost";
const SW_SCOPE = "/travel-planner/";
const CACHE_NAME = "roamwise-v4";

type AnyResponse = FakeResponse;

class FakeResponse {
  ok: boolean;
  url: string;
  type: string;
  body: unknown;
  constructor(body: unknown, opts: { ok?: boolean; url?: string; type?: string } = {}) {
    this.body = body;
    this.ok = opts.ok ?? true;
    this.url = opts.url ?? "";
    this.type = opts.type ?? "basic";
  }
  clone() {
    return new FakeResponse(this.body, { ok: this.ok, url: this.url, type: this.type });
  }
  static error() {
    return new FakeResponse(null, { ok: false, type: "error" });
  }
}

const keyOf = (req: string | { url: string }) => (typeof req === "string" ? req : req.url);
const abs = (path: string) => `${ORIGIN}${path}`;

function makeCaches() {
  const stores = new Map<string, Map<string, AnyResponse>>();
  const store = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name)!;
  };
  return {
    stores,
    open: vi.fn(async (name: string) => {
      const s = store(name);
      return {
        put: vi.fn(async (req: string | { url: string }, res: AnyResponse) => {
          s.set(keyOf(req), res);
        }),
        addAll: vi.fn(async (urls: string[]) => {
          urls.forEach((u) => s.set(keyOf(u), new FakeResponse("shell", { url: String(u) })));
        }),
        match: vi.fn(async (req: string | { url: string }) => s.get(keyOf(req))),
      };
    }),
    match: vi.fn(async (req: string | { url: string }) => {
      for (const s of stores.values()) {
        const hit = s.get(keyOf(req));
        if (hit) return hit;
      }
      return undefined;
    }),
    keys: vi.fn(async () => [...stores.keys()]),
    delete: vi.fn(async (name: string) => stores.delete(name)),
  };
}

function makeSelf() {
  const listeners: Record<string, (event: unknown) => void> = {};
  return {
    location: { pathname: `${SW_SCOPE}sw.js`, origin: ORIGIN },
    addEventListener: (type: string, cb: (event: unknown) => void) => {
      listeners[type] = cb;
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
    listeners,
  };
}

type Harness = {
  self: ReturnType<typeof makeSelf>;
  caches: ReturnType<typeof makeCaches>;
  fetch: ReturnType<typeof vi.fn>;
};

function loadSw(): Harness {
  const self = makeSelf();
  const caches = makeCaches();
  const fetch = vi.fn();
  const run = new Function("self", "caches", "fetch", "Response", "URL", swSource);
  run(self, caches, fetch, FakeResponse, URL);
  return { self, caches, fetch };
}

function fetchEvent(pathname: string, opts: { method?: string; mode?: string } = {}) {
  const url = pathname.startsWith("http") ? pathname : `${ORIGIN}${pathname}`;
  let responded: Promise<AnyResponse> | undefined;
  const event = {
    request: { url, method: opts.method ?? "GET", mode: opts.mode ?? "no-cors" },
    respondWith: (p: Promise<AnyResponse>) => {
      responded = p;
    },
    waitUntil: vi.fn(),
    get responded() {
      return responded;
    },
  };
  return event;
}

async function dispatchFetch(h: Harness, event: ReturnType<typeof fetchEvent>) {
  h.self.listeners.fetch(event);
  return event.responded ? await event.responded : undefined;
}

// putInCache writes are intentionally fire-and-forget (never block the
// response), so let their microtasks settle before asserting cache contents.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let h: Harness;
beforeEach(() => {
  h = loadSw();
});

describe("sw.js — lifecycle", () => {
  it("pre-caches the app shell and activates immediately on install", async () => {
    const event = { waitUntil: vi.fn() };
    h.self.listeners.install(event);
    await event.waitUntil.mock.calls[0][0];

    const shell = h.caches.stores.get(CACHE_NAME)!;
    expect(shell.has(SW_SCOPE)).toBe(true);
    expect(shell.has(`${SW_SCOPE}index.html`)).toBe(true);
    expect(shell.has(`${SW_SCOPE}manifest.json`)).toBe(true);
    expect(h.self.skipWaiting).toHaveBeenCalledOnce();
  });

  it("purges outdated caches and claims clients on activate", async () => {
    h.caches.stores.set("roamwise-v3", new Map());
    h.caches.stores.set(CACHE_NAME, new Map());
    const event = { waitUntil: vi.fn() };

    h.self.listeners.activate(event);
    await event.waitUntil.mock.calls[0][0];

    expect(h.caches.stores.has("roamwise-v3")).toBe(false);
    expect(h.caches.stores.has(CACHE_NAME)).toBe(true);
    expect(h.self.clients.claim).toHaveBeenCalledOnce();
  });
});

describe("sw.js — fetch routing", () => {
  it("ignores non-GET and cross-origin requests (no respondWith)", async () => {
    const post = fetchEvent(`${SW_SCOPE}manifest.json`, { method: "POST" });
    const cross = fetchEvent("http://evil.example/x.js");
    h.self.listeners.fetch(post);
    h.self.listeners.fetch(cross);
    expect(post.responded).toBeUndefined();
    expect(cross.responded).toBeUndefined();
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("navigation: network-first serves and caches the fresh page", async () => {
    const fresh = new FakeResponse("<html>", { ok: true, url: `${SW_SCOPE}` });
    h.fetch.mockResolvedValueOnce(fresh);

    const res = await dispatchFetch(h, fetchEvent(SW_SCOPE, { mode: "navigate" }));

    expect(res).toBe(fresh);
    await flush();
    expect(h.caches.stores.get(CACHE_NAME)!.size).toBe(1);
  });

  it("navigation offline: falls back to the cached app shell", async () => {
    const shell = new FakeResponse("shell", { url: `${SW_SCOPE}index.html` });
    h.caches.stores.set(CACHE_NAME, new Map([[`${SW_SCOPE}index.html`, shell]]));
    h.fetch.mockRejectedValueOnce(new Error("offline"));

    const res = await dispatchFetch(h, fetchEvent(SW_SCOPE, { mode: "navigate" }));
    expect(res).toBe(shell);
  });

  it("navigation offline with empty cache: still returns a valid Response", async () => {
    h.fetch.mockRejectedValueOnce(new Error("offline"));
    const res = await dispatchFetch(h, fetchEvent(SW_SCOPE, { mode: "navigate" }));
    expect(res).toBeInstanceOf(FakeResponse);
    expect((res as FakeResponse).type).toBe("error");
  });

  it("hashed /assets/: cache-first serves cache without hitting network", async () => {
    const asset = `${SW_SCOPE}assets/index-abc123.js`;
    const cached = new FakeResponse("cached-js", { url: abs(asset) });
    h.caches.stores.set(CACHE_NAME, new Map([[abs(asset), cached]]));

    const res = await dispatchFetch(h, fetchEvent(asset));
    expect(res).toBe(cached);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("hashed /assets/: cache miss fetches and stores", async () => {
    const asset = `${SW_SCOPE}assets/chunk-def456.js`;
    const net = new FakeResponse("net-js", { ok: true, url: abs(asset) });
    h.fetch.mockResolvedValueOnce(net);

    const res = await dispatchFetch(h, fetchEvent(asset));
    expect(res).toBe(net);
    await flush();
    expect(h.caches.stores.get(CACHE_NAME)!.get(abs(asset))).toStrictEqual(net);
  });

  it("unhashed asset: network-first returns fresh and updates cache", async () => {
    const manifest = `${SW_SCOPE}manifest.json`;
    const fresh = new FakeResponse("{fresh}", { ok: true, url: abs(manifest) });
    h.fetch.mockResolvedValueOnce(fresh);

    const res = await dispatchFetch(h, fetchEvent(manifest));
    expect(res).toBe(fresh);
    await flush();
    expect(h.caches.stores.get(CACHE_NAME)!.get(abs(manifest))).toStrictEqual(fresh);
  });

  it("unhashed asset offline: falls back to cached copy", async () => {
    const data = `${SW_SCOPE}data/rules/india.json`;
    const stale = new FakeResponse("{stale}", { url: abs(data) });
    h.caches.stores.set(CACHE_NAME, new Map([[abs(data), stale]]));
    h.fetch.mockRejectedValueOnce(new Error("offline"));

    const res = await dispatchFetch(h, fetchEvent(data));
    expect(res).toBe(stale);
  });

  it("never caches a non-ok response (no cache poisoning)", async () => {
    const notFound = new FakeResponse("nope", { ok: false, url: `${SW_SCOPE}manifest.json` });
    h.fetch.mockResolvedValueOnce(notFound);

    const res = await dispatchFetch(h, fetchEvent(`${SW_SCOPE}manifest.json`));
    expect(res).toBe(notFound);
    expect(h.caches.stores.get(CACHE_NAME)).toBeUndefined();
  });
});
