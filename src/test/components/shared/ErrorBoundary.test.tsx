import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ErrorBoundary from "@/components/shared/ErrorBoundary.tsx";

function Boom(): never {
  throw new Error("kaboom");
}

// Focused regression for the memory fix: the "Copied!" reset timeout must be
// cleared on unmount so it can't fire a stale setState after the boundary is
// gone. Broader crash-recovery + reporting behavior is covered by
// src/test/integration/ErrorBoundary.test.tsx.
describe("ErrorBoundary copy-timeout cleanup", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clears the copied-state timeout on unmount", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");

    const { unmount } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: /copy details/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument());

    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});

// Scoped-fallback mode is used to drop a crashed overlay (e.g. the cinematic
// fly-through) without the full-screen recovery takeover.
describe("ErrorBoundary scoped fallback", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the provided fallback instead of the recovery UI and fires onError", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary fallback={null} onError={onError}>
        <Boom />
      </ErrorBoundary>,
    );
    // No full-screen recovery heading — the fallback (null) silently replaces it.
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("still shows the default recovery UI when no fallback is given", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
