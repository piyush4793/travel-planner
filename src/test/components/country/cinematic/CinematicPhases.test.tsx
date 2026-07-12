import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import CinematicIntro from "@/components/country/cinematic/CinematicIntro.tsx";
import CinematicDone from "@/components/country/cinematic/CinematicDone.tsx";
import type { TripPlan } from "@/core/utils/tripPlans.ts";

const plan: TripPlan = {
  duration: "8 days",
  costPerPerson: "₹1.2L",
  days: [],
  note: "Pack light and carry cash.",
};

afterEach(cleanup);

describe("CinematicIntro", () => {
  it("shows the departure city + label only when an origin frames the route", () => {
    const { rerender } = render(
      <CinematicIntro showOrigin homeCity="Mumbai" homeLabel="India" title="Japan" plan={plan} statusMsg="Preparing…" mapAvailable />,
    );
    expect(screen.getByText("Mumbai")).toBeInTheDocument();
    expect(screen.getByText("India")).toBeInTheDocument();

    rerender(
      <CinematicIntro showOrigin={false} homeCity="Mumbai" homeLabel="India" title="Japan" plan={plan} statusMsg="Preparing…" mapAvailable />,
    );
    expect(screen.queryByText("Mumbai")).not.toBeInTheDocument();
  });

  it("renders combo countries and the status message", () => {
    render(
      <CinematicIntro
        showOrigin={false}
        homeCity=""
        homeLabel=""
        title="Japan"
        plan={plan}
        comboCountries={[{ name: "South Korea" }]}
        statusMsg="Loading photos…"
        mapAvailable
      />,
    );
    expect(screen.getByText("Also pairs with")).toBeInTheDocument();
    expect(screen.getByText("South Korea")).toBeInTheDocument();
    expect(screen.getByText("Loading photos…")).toBeInTheDocument();
  });

  it("warns when the map is unavailable", () => {
    render(
      <CinematicIntro showOrigin={false} homeCity="" homeLabel="" title="Japan" plan={plan} statusMsg="…" mapAvailable={false} />,
    );
    expect(screen.getByText(/Switch to Map view/)).toBeInTheDocument();
  });
});

describe("CinematicDone", () => {
  it("returns home when there is an origin", () => {
    render(<CinematicDone showOrigin homeCity="Mumbai" plan={plan} />);
    expect(screen.getByRole("heading", { name: "Back in Mumbai!" })).toBeInTheDocument();
    expect(screen.getByText("Pack light and carry cash.")).toBeInTheDocument();
  });

  it("falls back to a generic completion heading without an origin", () => {
    render(<CinematicDone showOrigin={false} homeCity="" plan={plan} />);
    expect(screen.getByRole("heading", { name: "Trip complete!" })).toBeInTheDocument();
  });
});
