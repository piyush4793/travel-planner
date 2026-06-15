import { renderHook, act } from "@testing-library/react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

// Save originals
const originalMatchMedia = window.matchMedia;
const originalUserAgent = Object.getOwnPropertyDescriptor(navigator, "userAgent");

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  if (originalUserAgent) {
    Object.defineProperty(navigator, "userAgent", originalUserAgent);
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
});
