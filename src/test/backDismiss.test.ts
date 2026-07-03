import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBackDismiss } from "../hooks/useBackDismiss";

describe("useBackDismiss", () => {
  let backSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset history state between tests. Mock history.back() to synchronously
    // emit the popstate the browser would, so the hook's internal ignore-count
    // stays balanced across tests without real navigation.
    window.history.replaceState(null, "");
    backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  });

  afterEach(() => {
    backSpy.mockRestore();
  });

  it("pushes a sentinel history entry while open", () => {
    const { unmount } = renderHook(() => useBackDismiss(true, () => {}));
    expect((window.history.state as { tpOverlay?: boolean } | null)?.tpOverlay).toBe(true);
    unmount();
  });

  it("does not push a history entry while closed", () => {
    const { unmount } = renderHook(() => useBackDismiss(false, () => {}));
    expect((window.history.state as { tpOverlay?: boolean } | null)?.tpOverlay).toBeUndefined();
    unmount();
  });

  it("dismisses the overlay when the Back button fires a popstate", () => {
    const onDismiss = vi.fn();
    const { unmount } = renderHook(() => useBackDismiss(true, onDismiss));
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("dismisses the topmost overlay first when several are stacked", () => {
    const lower = vi.fn();
    const upper = vi.fn();
    const h1 = renderHook(() => useBackDismiss(true, lower));
    const h2 = renderHook(() => useBackDismiss(true, upper));

    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(upper).toHaveBeenCalledTimes(1);
    expect(lower).not.toHaveBeenCalled();

    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(lower).toHaveBeenCalledTimes(1);

    h2.unmount();
    h1.unmount();
  });

  it("stops responding to Back once closed", () => {
    const onDismiss = vi.fn();
    const { rerender, unmount } = renderHook(({ open }) => useBackDismiss(open, onDismiss), {
      initialProps: { open: true },
    });
    rerender({ open: false });
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(onDismiss).not.toHaveBeenCalled();
    unmount();
  });

  it("close() dismisses the overlay", () => {
    const onDismiss = vi.fn();
    const { result, unmount } = renderHook(() => useBackDismiss(true, onDismiss));
    act(() => result.current());
    expect(onDismiss).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("rewinds the sentinel entry when the overlay closes programmatically", () => {
    const onDismiss = vi.fn();
    const { rerender, unmount } = renderHook(({ open }) => useBackDismiss(open, onDismiss), {
      initialProps: { open: true },
    });
    backSpy.mockClear();
    rerender({ open: false });
    expect(backSpy).toHaveBeenCalledTimes(1);
    unmount();
  });
});
