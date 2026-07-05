import { renderHook, act, waitFor } from "@testing-library/react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

// Save originals
const originalMatchMedia = window.matchMedia;
const originalUserAgent = Object.getOwnPropertyDescriptor(navigator, "userAgent");
const originalRelatedApps = Object.getOwnPropertyDescriptor(navigator, "getInstalledRelatedApps");

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  if (originalUserAgent) {
    Object.defineProperty(navigator, "userAgent", originalUserAgent);
  }
  if (originalRelatedApps) {
    Object.defineProperty(navigator, "getInstalledRelatedApps", originalRelatedApps);
  } else {
    delete (navigator as unknown as Record<string, unknown>).getInstalledRelatedApps;
  }
});

function mockMatchMedia(standaloneMatch: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: standaloneMatch,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
}

describe("useInstallPrompt", () => {
  it("reports not installed by default", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.canPrompt).toBe(false);
  });

  it("detects standalone mode as installed", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstalled).toBe(true);
  });

  it("captures beforeinstallprompt event", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useInstallPrompt());

    const fakeEvent = new Event("beforeinstallprompt");
    (fakeEvent as Event & { preventDefault: () => void }).preventDefault = vi.fn();
    act(() => {
      window.dispatchEvent(fakeEvent);
    });

    expect(result.current.canPrompt).toBe(true);
  });

  it("promptInstall returns false when no deferred prompt", async () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useInstallPrompt());
    const accepted = await result.current.promptInstall();
    expect(accepted).toBe(false);
  });

  it("detects iOS from user agent", () => {
    mockMatchMedia(false);
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
      configurable: true,
    });
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isIOS).toBe(true);
  });

  it("detects non-iOS from user agent", () => {
    mockMatchMedia(false);
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
      configurable: true,
    });
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isIOS).toBe(false);
  });

  it("reports installedInBrowser=false by default", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.installedInBrowser).toBe(false);
  });

  it("detects an already-installed PWA via getInstalledRelatedApps", async () => {
    mockMatchMedia(false);
    Object.defineProperty(navigator, "getInstalledRelatedApps", {
      value: vi.fn().mockResolvedValue([{ platform: "webapp", url: "https://x/manifest.json" }]),
      configurable: true,
    });
    const { result } = renderHook(() => useInstallPrompt());
    await waitFor(() => expect(result.current.installedInBrowser).toBe(true));
  });

  it("ignores non-webapp related apps", async () => {
    mockMatchMedia(false);
    Object.defineProperty(navigator, "getInstalledRelatedApps", {
      value: vi.fn().mockResolvedValue([{ platform: "play", id: "com.example" }]),
      configurable: true,
    });
    const { result } = renderHook(() => useInstallPrompt());
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.installedInBrowser).toBe(false);
  });

  it("openApp opens the app URL in a new context", () => {
    mockMatchMedia(false);
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      result.current.openApp();
    });
    expect(open).toHaveBeenCalledTimes(1);
    expect(String(open.mock.calls[0][0])).toContain("http");
    expect(open.mock.calls[0][1]).toBe("_blank");
    expect(open.mock.calls[0][2]).toBe("noopener,noreferrer");
    open.mockRestore();
  });
});
