import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBackDismiss } from "../hooks/useBackDismiss";

describe("useBackDismiss", () => {
  beforeEach(() => {
    // Reset history state between tests.
    window.history.replaceState(null, "");
  });

  it("pushes a history entry while open", () => {
    renderHook(() => useBackDismiss(true, () => {}));
    expect((window.history.state as { tpOverlay?: boolean } | null)?.tpOverlay).toBe(true);
  });

  it("does not push a history entry while closed", () => {
    renderHook(() => useBackDismiss(false, () => {}));
    expect((window.history.state as { tpOverlay?: boolean } | null)?.tpOverlay).toBeUndefined();
  });

  it("calls onDismiss when the Back button fires a popstate", () => {
    const onDismiss = vi.fn();
    renderHook(() => useBackDismiss(true, onDismiss));
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("stops listening once closed", () => {
    const onDismiss = vi.fn();
    const { rerender } = renderHook(({ open }) => useBackDismiss(open, onDismiss), {
      initialProps: { open: true },
    });
    rerender({ open: false });
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("close() navigates back when an overlay entry was pushed", () => {
    const onDismiss = vi.fn();
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const { result } = renderHook(() => useBackDismiss(true, onDismiss));
    act(() => result.current());
    expect(backSpy).toHaveBeenCalledTimes(1);
    backSpy.mockRestore();
  });

  it("close() dismisses directly when no overlay entry exists", () => {
    const onDismiss = vi.fn();
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const { result } = renderHook(() => useBackDismiss(false, onDismiss));
    act(() => result.current());
    expect(backSpy).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    backSpy.mockRestore();
  });
});
