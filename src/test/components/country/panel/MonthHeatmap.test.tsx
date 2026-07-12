import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MonthHeatmap from "@/components/country/panel/MonthHeatmap.tsx";

describe("MonthHeatmap", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders only months that have a best/avoid designation", () => {
    render(<MonthHeatmap bestMonths={["April", "May"]} worstMonths={["July"]} />);

    expect(screen.getByText("Apr")).toBeInTheDocument();
    expect(screen.getByText("May")).toBeInTheDocument();
    expect(screen.getByText("Jul")).toBeInTheDocument();
    // A neutral month is omitted entirely.
    expect(screen.queryByText("Feb")).not.toBeInTheDocument();
    expect(screen.getAllByText("Best")).toHaveLength(2);
    expect(screen.getByText("Avoid")).toBeInTheDocument();
  });

  it("renders nothing when there are no designated months", () => {
    const { container } = render(<MonthHeatmap bestMonths={[]} worstMonths={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("highlights the current month freshly on each render (no stale module-load value)", () => {
    vi.useFakeTimers();
    // March 2025 — current month index 2.
    vi.setSystemTime(new Date(2025, 2, 15));

    render(<MonthHeatmap bestMonths={["March", "September"]} worstMonths={[]} />);

    // Current month label is emphasised (emerald), non-current stays gray.
    expect(screen.getByText("Mar").className).toContain("text-emerald-700");
    expect(screen.getByText("Sep").className).toContain("text-gray-500");
    // The current month is announced to screen readers, not conveyed by colour alone.
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("Current month: Mar");
  });
});
