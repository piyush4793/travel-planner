import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import CinematicDayPanel from "@/components/country/cinematic/CinematicDayPanel.tsx";
import type { DayEntry } from "@/core/utils/tripPlans.ts";
import type { CityStop } from "@/components/country/cinematic/engine.ts";

const day = (over?: Partial<DayEntry>): DayEntry => ({
  label: "Arrival — Tokyo",
  activities: ["Senso-ji temple (Asakusa)", "Shibuya crossing"],
  ...over,
});

const stop = (over?: Partial<CityStop>): CityStop => ({
  name: "Tokyo",
  coords: [139.69, 35.68],
  days: [day(), day({ label: "Day 2" })],
  ...over,
});

afterEach(cleanup);

describe("CinematicDayPanel", () => {
  it("renders stop position, day sub-count and the day heading", () => {
    render(<CinematicDayPanel stop={stop()} day={day()} stopIndex={0} stopCount={3} dayIndex={0} visibleActs={0} />);
    expect(screen.getByText("Stop 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("· Day 1/2")).toBeInTheDocument();
    expect(screen.getByText("Arrival")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tokyo" })).toBeInTheDocument();
  });

  it("reveals only visibleActs activities and splits detail parentheticals", () => {
    render(<CinematicDayPanel stop={stop()} day={day()} stopIndex={0} stopCount={1} dayIndex={0} visibleActs={1} />);
    expect(screen.getByText("Senso-ji temple")).toBeInTheDocument();
    expect(screen.getByText("(Asakusa)")).toBeInTheDocument();
    expect(screen.queryByText("Shibuya crossing")).not.toBeInTheDocument();
  });

  it("shows the next-transport hint and hotels only once all activities are revealed", () => {
    const d = day({ activities: ["A"], hotels: ["Park Hyatt"] });
    const s = stop({ transportToNext: { type: "train", label: "Shinkansen to Kyoto" } });
    render(<CinematicDayPanel stop={s} day={d} stopIndex={0} stopCount={2} dayIndex={0} visibleActs={1} />);
    expect(screen.getByText(/Next: Shinkansen to Kyoto/)).toBeInTheDocument();
    expect(screen.getByText(/Park Hyatt/)).toBeInTheDocument();
  });

  it("hides hotels while activities are still revealing", () => {
    const d = day({ activities: ["A", "B"], hotels: ["Park Hyatt"] });
    render(<CinematicDayPanel stop={stop()} day={d} stopIndex={0} stopCount={1} dayIndex={0} visibleActs={1} />);
    expect(screen.queryByText(/Park Hyatt/)).not.toBeInTheDocument();
  });
});
