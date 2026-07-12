import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useHashView } from "@/hooks/useHashView.ts";
import { useBackDismiss } from "@/hooks/useBackDismiss.ts";

// Regression: switching top-level views away from a view that owns a persistent
// back-dismiss guard (e.g. PlanView) must navigate on the *first* click.
//
// The guard rewinds its history sentinel via `history.back()` in a passive
// cleanup on unmount. React runs all passive destroys before passive creates,
// so if `useHashView` pushed the new hash in a passive effect it would land
// *after* that rewind and get clobbered (the nav bounced back). `useHashView`
// pushes in a *layout* effect, which commits before the passive rewind, so the
// sentinel is no longer the current entry and the rewind correctly skips.

function GuardedChild({ onDismiss }: { onDismiss: () => void }) {
  useBackDismiss(true, onDismiss, true);
  return <span data-testid="plan">plan</span>;
}

function Harness({ onDismiss }: { onDismiss: () => void }) {
  const [view, setView] = useHashView("plan");
  return (
    <>
      <button onClick={() => setView("trips")}>go trips</button>
      {view === "plan" ? <GuardedChild onDismiss={onDismiss} /> : <span data-testid="trips">trips</span>}
    </>
  );
}

describe("view navigation vs persistent back-dismiss guard", () => {
  let backSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState(null, "", "#plan");
    // Mirror the browser: history.back() emits the popstate the guard listens for.
    backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  });

  afterEach(() => {
    backSpy.mockRestore();
    window.history.replaceState(null, "", "/");
  });

  it("navigates away on the first click without bouncing back", () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);

    // The guard registered its sentinel while on the plan view.
    expect((window.history.state as { tpOverlay?: boolean } | null)?.tpOverlay).toBe(true);

    fireEvent.click(screen.getByText("go trips"));

    expect(screen.getByTestId("trips")).toBeInTheDocument();
    expect(window.location.hash).toBe("#trips");
    // The guard's dismiss must not fire — leaving the view is not a step-back.
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
