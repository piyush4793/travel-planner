import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePlanCinematic } from "@/components/views/plan/usePlanCinematic";
import type { CinematicRoute } from "@/components/country/cinematic/engine";

const fakeRoute = { signature: "A" } as unknown as CinematicRoute;

describe("usePlanCinematic", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens and closes the overlay, reporting active state", () => {
    const onCinematicChange = vi.fn();
    const { result } = renderHook(() =>
      usePlanCinematic({ selectionSig: "Japan", onCinematicChange }),
    );

    expect(result.current.cinematicRoute).toBeNull();
    // Reports closed on mount.
    expect(onCinematicChange).toHaveBeenLastCalledWith(false);

    act(() => result.current.openCinematic(fakeRoute));
    expect(result.current.cinematicRoute).toBe(fakeRoute);
    expect(onCinematicChange).toHaveBeenLastCalledWith(true);

    act(() => result.current.closeCinematic());
    expect(result.current.cinematicRoute).toBeNull();
    expect(onCinematicChange).toHaveBeenLastCalledWith(false);
  });

  it("auto-closes the overlay when the route identity (selectionSig) changes", () => {
    const { result, rerender } = renderHook(
      ({ sig }: { sig: string }) => usePlanCinematic({ selectionSig: sig }),
      { initialProps: { sig: "Japan" } },
    );

    act(() => result.current.openCinematic(fakeRoute));
    expect(result.current.cinematicRoute).toBe(fakeRoute);

    rerender({ sig: "Japan → Thailand" });
    expect(result.current.cinematicRoute).toBeNull();
  });

  it("reports closed on unmount so the hidden MapView is hidden again", () => {
    const onCinematicChange = vi.fn();
    const { unmount } = renderHook(() =>
      usePlanCinematic({ selectionSig: "Japan", onCinematicChange }),
    );
    onCinematicChange.mockClear();
    unmount();
    expect(onCinematicChange).toHaveBeenCalledWith(false);
  });
});
