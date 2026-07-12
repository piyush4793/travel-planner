import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ItineraryModal from "@/components/country/ItineraryModal.tsx";
import { buildRoute } from "@/core/utils/googleMapsRoute.ts";
import type { Country } from "@/core/types.ts";
import type { CountryRule } from "@/core/data/itineraryRules.ts";
import type { TripPlan } from "@/core/utils/tripPlans.ts";

function makeCountry(overrides: Partial<Country> = {}): Country {
  return {
    name: "Japan",
    lat: 35.6762,
    lng: 139.6503,
    bestMonths: ["March", "April"],
    budget: "₹2L",
    experiences: ["Food", "Culture"],
    ...overrides,
  };
}

function makePlan(overrides: Partial<TripPlan> = {}): TripPlan {
  return {
    duration: "5 days",
    costPerPerson: "₹1L",
    costBasis: "couple",
    note: "Tokyo → Kyoto: train | SIM: eSIM works | Best months: March, April | Extras: book rail seats",
    days: [
      {
        label: "Day 1 — Tokyo",
        theme: "Culture",
        activities: ["Meiji Shrine (₹500)", "Tsukiji Market — Sushi crawl"],
        hotels: ["Park Hotel — skyline rooms"],
      },
      { label: "Day 2 — Tokyo", activities: ["Akihabara", "Shibuya Crossing"] },
      { label: "Day 3 — Kyoto", theme: "Temples", activities: ["Fushimi Inari", "Gion walk"], hotels: ["Ryokan Kyoto"] },
      { label: "Day 4 — Osaka", activities: ["Dotonbori", "Osaka Castle"] },
    ],
    ...overrides,
  };
}

function makeRule(): CountryRule {
  return {
    cityOrder: ["Tokyo", "Kyoto", "Osaka"],
    cities: {
      Tokyo: {
        name: "Tokyo",
        minDays: 1,
        recDays: 2,
        maxDays: 4,
        days: [{ theme: "Culture", activities: [], meals: ["Ichiran Ramen"] }],
      },
      Kyoto: {
        name: "Kyoto",
        minDays: 1,
        recDays: 2,
        maxDays: 3,
        days: [{ theme: "Temples", activities: [], meals: ["Nishiki Market"] }],
      },
      Osaka: { name: "Osaka", minDays: 1, recDays: 2, maxDays: 3, days: [] },
    },
    connections: [
      { from: "Tokyo", to: "Kyoto", method: "Shinkansen train", cost: "₹12,000" },
      { from: "Kyoto", to: "Osaka", method: "Express bus", cost: "₹1,500" },
    ],
  };
}

describe("ItineraryModal", () => {
  it("renders the country and plan header with duration, cost basis, and structured notes", () => {
    render(<ItineraryModal plan={makePlan()} country={makeCountry()} rule={null} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: /Itinerary — Japan/i })).toBeInTheDocument();
    expect(screen.getByText("Day-by-Day Itinerary")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Japan" })).toBeInTheDocument();
    expect(screen.getByText("5 days")).toBeInTheDocument();
    expect(screen.getByText("₹1L")).toBeInTheDocument();
    expect(screen.getByLabelText("per couple")).toHaveTextContent("👫");
    expect(screen.getByText("Practical Notes")).toBeInTheDocument();
    expect(screen.getByText("SIM")).toBeInTheDocument();
    expect(screen.getByText("eSIM works")).toBeInTheDocument();
    expect(screen.getByText("Tips")).toBeInTheDocument();
    expect(screen.getByText("book rail seats")).toBeInTheDocument();
  });

  it("renders every day label, its activities, hotels, parsed costs, details, and rule meals", () => {
    render(<ItineraryModal plan={makePlan()} country={makeCountry()} rule={makeRule()} onClose={vi.fn()} />);

    for (const label of ["Day 1 — Tokyo", "Day 2 — Tokyo", "Day 3 — Kyoto", "Day 4 — Osaka"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const activity of ["Meiji Shrine", "Tsukiji Market", "Akihabara", "Shibuya Crossing", "Fushimi Inari", "Gion walk", "Dotonbori", "Osaka Castle"]) {
      expect(screen.getByText(activity)).toBeInTheDocument();
    }
    expect(screen.getByText("(₹500)")).toBeInTheDocument();
    expect(screen.getByText("Sushi crawl")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Park Hotel — skyline rooms/i })).toHaveAttribute("href", expect.stringContaining("Park%20Hotel%20hotel%20booking%20Tokyo"));
    expect(screen.getByRole("link", { name: /Ryokan Kyoto/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ichiran Ramen" })).toHaveAttribute("href", expect.stringContaining("Ichiran%20Ramen%2C%20Tokyo"));
    expect(screen.getByRole("link", { name: "Nishiki Market" })).toBeInTheDocument();
  });

  it("renders multi-city route groups and transport details between city groups", () => {
    render(<ItineraryModal plan={makePlan()} country={makeCountry()} rule={makeRule()} onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Tokyo" })).toBeInTheDocument();
    expect(screen.getByText("2 days")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kyoto" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Osaka" })).toBeInTheDocument();
    expect(screen.getByText("Tokyo → Kyoto")).toBeInTheDocument();
    expect(screen.getByText("Shinkansen train")).toBeInTheDocument();
    expect(screen.getByText("₹12,000")).toBeInTheDocument();
    expect(screen.getByText("Kyoto → Osaka")).toBeInTheDocument();
    expect(screen.getByText("Express bus")).toBeInTheDocument();
    expect(screen.getByText("₹1,500")).toBeInTheDocument();
    expect(screen.getAllByText("🚂").length).toBeGreaterThan(0);
    expect(screen.getAllByText("🚌").length).toBeGreaterThan(0);
  });

  it("collapses a day card and exposes a Google Maps route link", async () => {
    const user = userEvent.setup({ delay: null });
    const plan = makePlan();
    render(<ItineraryModal plan={plan} country={makeCountry()} rule={null} onClose={vi.fn()} />);

    const dayToggle = screen.getByRole("button", { name: /Day 1 — Tokyo/i });
    expect(dayToggle).toHaveAttribute("aria-expanded", "true");
    await user.click(dayToggle);
    expect(dayToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("2 activities")).toBeInTheDocument();

    const expectedRoute = buildRoute(plan.days[0].activities, "Tokyo");
    expect(expectedRoute).not.toBeNull();
    expect(screen.getAllByRole("link", { name: /Route/i })[0]).toHaveAttribute("href", expectedRoute?.url);
  });

  it("copies a route link from the copy button", async () => {
    const user = userEvent.setup({ delay: null });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const plan = makePlan();
    render(<ItineraryModal plan={plan} country={makeCountry()} rule={null} onClose={vi.fn()} />);

    await user.click(screen.getAllByTitle("Copy route link")[0]);

    expect(writeText).toHaveBeenCalledWith(buildRoute(plan.days[0].activities, "Tokyo")?.url);
    expect(await screen.findByTitle("Copied!")).toHaveTextContent("✓");
  });

  it("calls onClose from the close button", async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();
    render(<ItineraryModal plan={makePlan()} country={makeCountry()} rule={null} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders a single-day plan without hotels or route navigation", () => {
    render(
      <ItineraryModal
        country={makeCountry({ name: "Singapore" })}
        rule={null}
        onClose={vi.fn()}
        plan={makePlan({
          duration: "1 day",
          costPerPerson: "₹30K",
          costBasis: undefined,
          note: "Keep it flexible.",
          days: [{ label: "Day 1 — Singapore", activities: ["Gardens by the Bay"] }],
        })}
      />,
    );

    expect(screen.getAllByRole("heading", { name: "Singapore" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 day").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("per person")).toHaveTextContent("👤");
    expect(screen.getByText("Gardens by the Bay")).toBeInTheDocument();
    expect(screen.getByText("Keep it flexible.")).toBeInTheDocument();
    expect(screen.queryByText(/Jump to city/i)).not.toBeInTheDocument();
  });
});
