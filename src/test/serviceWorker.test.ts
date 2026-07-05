import { describe, it, expect, vi, afterEach } from "vitest";
import {
  initServiceWorker,
  unregisterServiceWorkers,
} from "../core/serviceWorker";

function setServiceWorker(value: unknown): void {
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value,
  });
}

function mockRegistrations(count: number) {
  const unregister = vi.fn().mockResolvedValue(true);
  const regs = Array.from({ length: count }, () => ({ unregister }));
  const getRegistrations = vi.fn().mockResolvedValue(regs);
  const register = vi.fn().mockResolvedValue({});
  setServiceWorker({ getRegistrations, register });
  return { unregister, getRegistrations, register };
}

function mockCaches(keys: string[]) {
  const del = vi.fn().mockResolvedValue(true);
  vi.stubGlobal("caches", {
    keys: vi.fn().mockResolvedValue(keys),
    delete: del,
  });
  return { del };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  // Remove the mocked property so jsdom's default (absent) is restored.
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
});

describe("unregisterServiceWorkers", () => {
  it("unregisters every worker and purges every cache", async () => {
    const { unregister, getRegistrations } = mockRegistrations(2);
    const { del } = mockCaches(["a", "b", "c"]);

    await unregisterServiceWorkers();

    expect(getRegistrations).toHaveBeenCalledOnce();
    expect(unregister).toHaveBeenCalledTimes(2);
    expect(del).toHaveBeenCalledTimes(3);
    expect(del).toHaveBeenCalledWith("a");
  });

  it("swallows errors so a flaky cache API cannot break boot", async () => {
    setServiceWorker({
      getRegistrations: vi.fn().mockRejectedValue(new Error("boom")),
    });
    await expect(unregisterServiceWorkers()).resolves.toBeUndefined();
  });
});

describe("initServiceWorker", () => {
  it("is a no-op when the browser has no service worker support", () => {
    delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    expect(() => initServiceWorker()).not.toThrow();
  });

  it("tears down stale workers in dev instead of registering", async () => {
    const { register, getRegistrations } = mockRegistrations(1);
    mockCaches([]);

    initServiceWorker();
    await Promise.resolve();

    expect(getRegistrations).toHaveBeenCalledOnce();
    expect(register).not.toHaveBeenCalled();
  });

  it("registers on window load in production", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("DEV", false);
    const { register } = mockRegistrations(0);

    initServiceWorker();
    expect(register).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("load"));
    expect(register).toHaveBeenCalledOnce();
  });
});
