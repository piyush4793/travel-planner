import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBreakpoint } from "@/hooks/useBreakpoint.ts";

type MatchState = {
  tablet: boolean;
  desktop: boolean;
};

function installMatchMedia(initial: MatchState) {
  const state = { ...initial };
  const listeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>();

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(min-width: 1024px)" ? state.desktop : state.tablet,
      media: query,
      onchange: null,
      addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (!listeners.has(query)) listeners.set(query, new Set());
        listeners.get(query)?.add(listener);
      },
      removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.get(query)?.delete(listener);
      },
      addListener: (listener: (event: MediaQueryListEvent) => void) => {
        if (!listeners.has(query)) listeners.set(query, new Set());
        listeners.get(query)?.add(listener);
      },
      removeListener: (listener: (event: MediaQueryListEvent) => void) => {
        listeners.get(query)?.delete(listener);
      },
      dispatchEvent: () => true,
    })),
  });

  return {
    emit(next: Partial<MatchState>) {
      Object.assign(state, next);
      for (const [query, queryListeners] of listeners.entries()) {
        const matches = query === "(min-width: 1024px)" ? state.desktop : state.tablet;
        queryListeners.forEach((listener) => {
          listener({ matches, media: query } as MediaQueryListEvent);
        });
      }
    },
  };
}

describe("useBreakpoint — P0", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns desktop when both media queries match", () => {
    installMatchMedia({ tablet: true, desktop: true });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current).toBe("desktop");
  });

  it("returns tablet when only the tablet query matches", () => {
    installMatchMedia({ tablet: true, desktop: false });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current).toBe("tablet");
  });

  it("returns mobile when neither query matches and reacts to later changes", () => {
    const media = installMatchMedia({ tablet: false, desktop: false });
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current).toBe("mobile");

    act(() => {
      media.emit({ tablet: true, desktop: false });
    });

    expect(result.current).toBe("tablet");
  });

  it("reacts across mobile, tablet, and desktop breakpoint changes", () => {
    const media = installMatchMedia({ tablet: false, desktop: false });
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current).toBe("mobile");

    act(() => {
      media.emit({ tablet: true, desktop: false });
    });
    expect(result.current).toBe("tablet");

    act(() => {
      media.emit({ tablet: true, desktop: true });
    });
    expect(result.current).toBe("desktop");
  });
});
