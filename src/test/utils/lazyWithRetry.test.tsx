import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Component, Suspense, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { lazyWithRetry } from "@/utils/lazyWithRetry.ts";

const RELOAD_KEY = "roamwise:chunk-reload-at";

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <div>boundary-caught</div> : this.props.children;
  }
}

describe("lazyWithRetry", () => {
  const realLocation = window.location;
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...realLocation, reload },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: realLocation });
  });

  it("renders the imported component when the import succeeds", async () => {
    const Ok = lazyWithRetry(() => Promise.resolve({ default: () => <div>loaded-ok</div> }));

    render(
      <Suspense fallback={<div>loading</div>}>
        <Ok />
      </Suspense>,
    );

    expect(await screen.findByText("loaded-ok")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads once and stamps a guard when a stale chunk fails to import", async () => {
    const Broken = lazyWithRetry(() =>
      Promise.reject(new Error("Failed to fetch dynamically imported module")),
    );

    render(
      <Suspense fallback={<div>loading</div>}>
        <Broken />
      </Suspense>,
    );

    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(sessionStorage.getItem(RELOAD_KEY)).not.toBeNull();
  });

  it("rethrows to the boundary instead of reloading again within the guard window", async () => {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    const Broken = lazyWithRetry(() =>
      Promise.reject(new Error("Failed to fetch dynamically imported module")),
    );

    render(
      <Boundary>
        <Suspense fallback={<div>loading</div>}>
          <Broken />
        </Suspense>
      </Boundary>,
    );

    expect(await screen.findByText("boundary-caught")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });
});
