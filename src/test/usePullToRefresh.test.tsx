import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { usePullToRefresh } from "../hooks/usePullToRefresh";

function Harness({ onRefresh, enabled = true }: { onRefresh: () => void; enabled?: boolean }) {
  const { containerRef, pullDistance, refreshing } = usePullToRefresh({ onRefresh, enabled, threshold: 70 });
  return (
    <div ref={containerRef} data-testid="container">
      <div data-testid="readout">{refreshing ? "refreshing" : `pull:${Math.round(pullDistance)}`}</div>
    </div>
  );
}

function dispatchTouch(el: Element, type: string, clientY: number) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "touches", { value: [{ clientY }], configurable: true });
  Object.defineProperty(ev, "target", { value: el, configurable: true });
  act(() => { el.dispatchEvent(ev); });
  return ev;
}

describe("usePullToRefresh", () => {
  it("triggers onRefresh when the pull passes the threshold", () => {
    const onRefresh = vi.fn();
    const { getByTestId } = render(<Harness onRefresh={onRefresh} />);
    const container = getByTestId("container");

    dispatchTouch(container, "touchstart", 100);
    dispatchTouch(container, "touchmove", 260); // dy=160 → pull=80 (> threshold 70)
    dispatchTouch(container, "touchend", 260);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onRefresh when the pull is below the threshold", () => {
    const onRefresh = vi.fn();
    const { getByTestId } = render(<Harness onRefresh={onRefresh} />);
    const container = getByTestId("container");

    dispatchTouch(container, "touchstart", 100);
    dispatchTouch(container, "touchmove", 180); // dy=80 → pull=40 (< threshold 70)
    dispatchTouch(container, "touchend", 180);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("ignores the gesture entirely when disabled", () => {
    const onRefresh = vi.fn();
    const { getByTestId } = render(<Harness onRefresh={onRefresh} enabled={false} />);
    const container = getByTestId("container");

    dispatchTouch(container, "touchstart", 100);
    dispatchTouch(container, "touchmove", 300);
    dispatchTouch(container, "touchend", 300);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("prevents default on a downward pull so native scroll is suppressed", () => {
    const onRefresh = vi.fn();
    const { getByTestId } = render(<Harness onRefresh={onRefresh} />);
    const container = getByTestId("container");

    dispatchTouch(container, "touchstart", 100);
    const move = dispatchTouch(container, "touchmove", 200);

    expect(move.defaultPrevented).toBe(true);
  });

  it("does not engage an upward swipe (dy <= 0)", () => {
    const onRefresh = vi.fn();
    const { getByTestId } = render(<Harness onRefresh={onRefresh} />);
    const container = getByTestId("container");

    dispatchTouch(container, "touchstart", 200);
    dispatchTouch(container, "touchmove", 100); // upward
    dispatchTouch(container, "touchend", 100);

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
