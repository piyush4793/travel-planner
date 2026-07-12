import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CinematicOverview from "@/components/country/cinematic/CinematicOverview.tsx";
import type { CityStop } from "@/components/country/cinematic/engine.ts";

const stop = (name: string, dayCount: number, extra?: Partial<CityStop>): CityStop => ({
  name,
  coords: [0, 0],
  days: Array.from({ length: dayCount }, (_, i) => ({ label: `Day ${i + 1}`, activities: [] })),
  ...extra,
});

afterEach(cleanup);

describe("CinematicOverview", () => {
  it("renders each stop with a pluralized day count and transport label", () => {
    const stops = [
      stop("Tokyo", 3, { transportToNext: { type: "train", label: "Shinkansen to Kyoto" } }),
      stop("Kyoto", 1),
    ];
    render(<CinematicOverview title="Japan" stops={stops} onClose={() => {}} />);

    expect(screen.getByText(/Japan — Itinerary Overview/)).toBeInTheDocument();
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByText("3 days")).toBeInTheDocument();
    expect(screen.getByText("1 day")).toBeInTheDocument();
    expect(screen.getByText("→ Shinkansen to Kyoto")).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no stops", () => {
    render(<CinematicOverview title="Nowhere" stops={[]} onClose={() => {}} />);
    expect(screen.getByText(/No city route data available/)).toBeInTheDocument();
  });

  it("fires onClose from both the header ✕ and the footer button", async () => {
    const onClose = vi.fn();
    render(<CinematicOverview title="Japan" stops={[stop("Tokyo", 2)]} onClose={onClose} />);
    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    expect(closeButtons).toHaveLength(2);
    await userEvent.click(closeButtons[0]);
    await userEvent.click(closeButtons[1]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
