import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import PlanTripHeader, { type HeaderStep, buildHeaderStats } from "@/components/views/plan/shell/PlanTripHeader";
import type { Country } from "@/core/types.ts";

const steps: HeaderStep[] = [
  { key: "basics", short: "Basics", title: "The basics" },
  { key: "cities", short: "Places", title: "Pick places" },
  { key: "review", short: "Review", title: "Your trip" },
];

const c = (name: string): Country => ({ name, lat: 0, lng: 0, bestMonths: [], budget: "", experiences: [] });

function renderHeader(props: Partial<React.ComponentProps<typeof PlanTripHeader>> = {}) {
  return render(
    <PlanTripHeader
      selection={[c("Japan")]}
      routeStopLimit={2}
      steps={steps}
      activeStep={0}
      onGoToStep={vi.fn()}
      width="narrow"
      {...props}
    />,
  );
}

describe("PlanTripHeader", () => {
  it("shows a single destination name", () => {
    renderHeader({ selection: [c("Japan")] });
    expect(screen.getByRole("heading", { name: "Japan", level: 1 })).toBeInTheDocument();
  });

  it("names the first stops and collapses the rest into a +N pill for a route", () => {
    renderHeader({
      selection: [c("Japan"), c("Thailand"), c("Vietnam")],
      routeStopLimit: 2,
    });
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Japan");
    expect(h1).toHaveTextContent("Thailand");
    expect(h1).toHaveAttribute("aria-label", "Planning a route through Japan, Thailand, Vietnam");
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("renders one tappable step button per step and routes taps to the handler", () => {
    const onGoToStep = vi.fn();
    renderHeader({ activeStep: 2, onGoToStep });
    const nav = screen.getByRole("navigation", { name: "Planning steps" });
    const steps = within(nav).getAllByRole("button");
    expect(steps).toHaveLength(3);
    expect(steps[2]).toHaveAttribute("aria-current", "step");
    expect(steps[0]).not.toHaveAttribute("aria-current");
    fireEvent.click(steps[0]);
    expect(onGoToStep).toHaveBeenCalledWith(0);
  });

  it("renders a supplied save slot", () => {
    renderHeader({ saveSlot: <div>save-here</div> });
    expect(screen.getByText("save-here")).toBeInTheDocument();
  });

  it("omits the save slot when none is supplied", () => {
    renderHeader({ selection: [c("Japan")] });
    expect(screen.queryByText("save-here")).not.toBeInTheDocument();
  });

  it("renders the progressive stats strip and marks a Basics estimate", () => {
    renderHeader({
      selection: [c("Japan"), c("Thailand")],
      stats: { days: 12, countries: 2, cities: 6, cost: "₹3L", costIcon: "👥", costLabel: "Couple", estimate: true },
    });
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("countries")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("₹3L", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Couple")).toBeInTheDocument();
  });

  it("omits the countries stat for a single-country trip", () => {
    renderHeader({
      selection: [c("Japan")],
      stats: { days: 8, countries: 1, cities: 3, cost: "₹2L", costIcon: "🧍", costLabel: "Solo" },
    });
    expect(screen.queryByText("countries")).not.toBeInTheDocument();
  });

  it("renders a who's-going basis control when a setter is supplied", () => {
    const onBasisChange = vi.fn();
    renderHeader({ basis: "couple", onBasisChange });
    fireEvent.click(screen.getByRole("button", { name: /Who's going/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Solo/i }));
    expect(onBasisChange).toHaveBeenCalledWith("solo");
  });

  it("renders a supplied identity slot instead of the default route identity", () => {
    renderHeader({
      selection: [c("Japan"), c("Thailand")],
      identitySlot: <button type="button">Switch country</button>,
    });
    expect(screen.getByRole("button", { name: "Switch country" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });
});

describe("buildHeaderStats", () => {
  const plan = { days: [{}, {}, {}], costPerPerson: "₹2L – ₹3L" };

  it("returns undefined when nothing is planned yet, so the strip never lies", () => {
    expect(buildHeaderStats(null, 0, 0, "👫", "per couple", true)).toBeUndefined();
    expect(buildHeaderStats(undefined, 2, 2, "👫", "per couple", false)).toBeUndefined();
  });

  it("maps a composed plan into the progressive stats shape", () => {
    expect(buildHeaderStats(plan, 4, 2, "👫", "per couple", false)).toEqual({
      days: 3,
      countries: 2,
      cities: 4,
      cost: "₹2L – ₹3L",
      costIcon: "👫",
      costLabel: "per couple",
      estimate: false,
    });
  });

  it("flags Basics as an estimate while later steps stay live", () => {
    expect(buildHeaderStats(plan, 4, 2, "👤", "per person", true)?.estimate).toBe(true);
    expect(buildHeaderStats(plan, 4, 2, "👤", "per person", false)?.estimate).toBe(false);
  });
});
