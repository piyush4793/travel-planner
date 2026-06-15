import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePanelDrag } from "../hooks/usePanelDrag";

describe("usePanelDrag — P0", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns the initial panel width", () => {
    const { result } = renderHook(() => usePanelDrag(400, 200));

    expect(result.current.panelWidth).toBe(400);
  });

  it("returns a startPanelDrag function and applies drag state", () => {
    const { result } = renderHook(() => usePanelDrag(400, 200));

    expect(result.current.startPanelDrag).toEqual(expect.any(Function));

    act(() => {
      result.current.startPanelDrag();
    });

    expect(document.body.style.userSelect).toBe("none");
    expect(document.body.style.cursor).toBe("col-resize");

    act(() => {
      document.dispatchEvent(new Event("pointerup"));
    });

    expect(document.body.style.userSelect).toBe("");
    expect(document.body.style.cursor).toBe("");
  });
});
