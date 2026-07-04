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

  function movePointer(clientX: number) {
    act(() => {
      document.dispatchEvent(Object.assign(new Event("pointermove"), { clientX }));
    });
  }

  it("updates panel width from pointer movement, clamped to [minWidth, 50vw]", () => {
    // jsdom default innerWidth is 1024 → maxWidth = 512
    const { result } = renderHook(() => usePanelDrag(400, 200));

    act(() => result.current.startPanelDrag());

    movePointer(600); // 1024-600 = 424, within range
    expect(result.current.panelWidth).toBe(424);

    movePointer(900); // 1024-900 = 124 → clamped up to minWidth 200
    expect(result.current.panelWidth).toBe(200);

    movePointer(100); // 1024-100 = 924 → clamped down to maxWidth 512
    expect(result.current.panelWidth).toBe(512);

    act(() => {
      document.dispatchEvent(new Event("pointerup"));
    });
  });

  it("resizes with arrow keys and clamps at bounds", () => {
    const { result } = renderHook(() => usePanelDrag(400, 200));
    const preventDefault = vi.fn();

    // ArrowLeft grows the panel by KEYBOARD_STEP (20)
    act(() => {
      result.current.dragHandleProps.onKeyDown({ key: "ArrowLeft", preventDefault } as never);
    });
    expect(result.current.panelWidth).toBe(420);

    // ArrowRight shrinks the panel by KEYBOARD_STEP (20)
    act(() => {
      result.current.dragHandleProps.onKeyDown({ key: "ArrowRight", preventDefault } as never);
    });
    expect(result.current.panelWidth).toBe(400);
    expect(preventDefault).toHaveBeenCalledTimes(2);

    // A non-arrow key is ignored
    act(() => {
      result.current.dragHandleProps.onKeyDown({ key: "Enter", preventDefault } as never);
    });
    expect(result.current.panelWidth).toBe(400);
  });

  it("exposes accessible separator props reflecting current width and bounds", () => {
    const { result } = renderHook(() => usePanelDrag(350, 220));
    const p = result.current.dragHandleProps;

    expect(p.role).toBe("separator");
    expect(p["aria-orientation"]).toBe("vertical");
    expect(p["aria-valuenow"]).toBe(350);
    expect(p["aria-valuemin"]).toBe(220);
    expect(p["aria-valuemax"]).toBe(512);
    expect(p.tabIndex).toBe(0);
  });

  it("cleans up drag listeners and body styles when unmounted mid-drag", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { result, unmount } = renderHook(() => usePanelDrag(400, 200));

    act(() => result.current.startPanelDrag());
    expect(document.body.style.cursor).toBe("col-resize");

    unmount();

    expect(document.body.style.userSelect).toBe("");
    expect(document.body.style.cursor).toBe("");
    expect(removeSpy).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("pointerup", expect.any(Function));
  });
});
