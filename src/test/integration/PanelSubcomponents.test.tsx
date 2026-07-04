import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { setupUser } from "../testUtils";
import { LearnAboutSection, PlanningResourcesSection, UsefulLinksSection } from "../../components/country/panel/InfoSections";
import PlanPreview from "../../components/country/panel/PlanPreview";
import CityCard from "../../components/country/panel/CityCard";
import type { Country, CityEntry } from "../../core/types";
import type { CountryRule } from "../../core/data/itineraryRules";
import type { TripPlan } from "../../core/utils/tripPlans";

const mocks = vi.hoisted(() => ({
  fetchCountryInfo: vi.fn(),
  getPlanningLinks: vi.fn(),
  isEnabled: vi.fn(),
  exportItineraryAsPdf: vi.fn(),
}));

vi.mock("../../utils/countryInfo", () => ({
  fetchCountryInfo: mocks.fetchCountryInfo,
}));

vi.mock("../../utils/planningLinks", () => ({
  getPlanningLinks: mocks.getPlanningLinks,
}));

vi.mock("../../core/featureFlags", () => ({
  isEnabled: mocks.isEnabled,
}));

vi.mock("../../utils/pdfExport", () => ({
  exportItineraryAsPdf: mocks.exportItineraryAsPdf,
}));

function makeCountry(overrides: Partial<Country> = {}): Country {
  return {
    name: "Japan",
    lat: 35.6762,
    lng: 139.6503,
    bestMonths: ["March", "April"],
    budget: "₹2L",
    experiences: ["Food", "Culture"],
    cities: [
      { name: "Tokyo", lat: 35.6762, lng: 139.6503, bestMonths: ["Mar"], notes: "Neon food neighborhoods" },
      { name: "Kyoto", lat: 35.0116, lng: 135.7681, bestMonths: ["Apr"], notes: "Temples and gardens" },
    ],
    ...overrides,
  };
}

function makePlan(overrides: Partial<TripPlan> = {}): TripPlan {
  return {
    duration: "5 days",
    costPerPerson: "₹1L",
    note: "Balanced first trip",
    costBasis: "couple",
    days: [
      { label: "Day 1 — Tokyo", activities: ["Shibuya", "Sushi"] },
      { label: "Day 2 — Kyoto", activities: ["Fushimi Inari"] },
    ],
    ...overrides,
  };
}

function makeRule(): CountryRule {
  return {
    cityOrder: ["Tokyo", "Kyoto"],
    cities: {
      Tokyo: { name: "Tokyo", minDays: 1, recDays: 2, maxDays: 4, days: [] },
      Kyoto: { name: "Kyoto", minDays: 1, recDays: 2, maxDays: 4, days: [] },
    },
    connections: [],
  };
}

describe("InfoSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlanningLinks.mockReturnValue([
      { label: "Official tourism", url: "https://example.test/tourism", emoji: "🏛️", description: "Entry rules and highlights" },
      { label: "Transit guide", url: "https://example.test/transit", emoji: "🚆", description: "Rail passes and routes" },
    ]);
  });

  it("loads country info only when expanded and renders fetched details", async () => {
    const user = setupUser();
    mocks.fetchCountryInfo.mockResolvedValue({
      capital: "Tokyo",
      currency: "Japanese yen",
      language: "Japanese",
      summary: "Japan blends food, nature, and culture.",
      thumbnail: "https://example.test/japan.jpg",
    });
    const currentCountryNameRef = { current: "Japan" };

    render(<LearnAboutSection countryName="Japan" currentCountryNameRef={currentCountryNameRef} />);

    const toggle = screen.getByRole("button", { name: /Learn about Japan/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(mocks.fetchCountryInfo).not.toHaveBeenCalled();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // Async region is an assertive-free live region so SR users hear load/error/content updates.
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
    expect(mocks.fetchCountryInfo).toHaveBeenCalledWith("Japan");
    expect(await screen.findByText("Japan blends food, nature, and culture.")).toBeInTheDocument();
    expect(screen.getByText(/Tokyo/)).toBeInTheDocument();
    expect(screen.getByText(/Japanese yen/)).toBeInTheDocument();
    expect(screen.getByText(/^🗣️\s*Japanese$/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Japan" })).toHaveAttribute("src", "https://example.test/japan.jpg");
    expect(screen.getByRole("link", { name: /Read more on Wikipedia/i })).toHaveAttribute("href", expect.stringContaining("Japan"));
  });

  it("shows retry after a failed info lookup and reloads successfully", async () => {
    const user = setupUser();
    mocks.fetchCountryInfo
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ summary: "Recovered country summary." });
    const currentCountryNameRef = { current: "Japan" };

    render(<LearnAboutSection countryName="Japan" currentCountryNameRef={currentCountryNameRef} />);

    await user.click(screen.getByRole("button", { name: /Learn about Japan/i }));
    expect(await screen.findByText("Failed to load info")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Retry/i }));

    expect(await screen.findByText("Recovered country summary.")).toBeInTheDocument();
    expect(mocks.fetchCountryInfo).toHaveBeenCalledTimes(2);
  });

  it("ignores stale country info when the selected country changes before fetch resolves", async () => {
    const user = setupUser();
    mocks.fetchCountryInfo.mockResolvedValue({ summary: "Stale Japan summary." });
    const currentCountryNameRef = { current: "France" };

    render(<LearnAboutSection countryName="Japan" currentCountryNameRef={currentCountryNameRef} />);

    await user.click(screen.getByRole("button", { name: /Learn about Japan/i }));

    await waitFor(() => expect(mocks.fetchCountryInfo).toHaveBeenCalledWith("Japan"));
    expect(screen.queryByText("Stale Japan summary.")).not.toBeInTheDocument();
  });

  it("renders planning resources from the link provider and toggles the section", async () => {
    const user = setupUser();

    render(<PlanningResourcesSection countryName="Japan" homeCountry="India" />);

    expect(mocks.getPlanningLinks).toHaveBeenCalledWith("Japan", "India");
    const toggle = screen.getByRole("button", { name: /Planning resources/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /Official tourism/i })).toHaveAttribute("href", "https://example.test/tourism");
    expect(screen.getByText("Entry rules and highlights")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Transit guide/i })).toHaveAttribute("href", "https://example.test/transit");
  });

  it("renders nothing when there are no useful links", () => {
    const { container } = render(<UsefulLinksSection links={[]} />);
    expect(container).toBeEmptyDOMElement();
    render(<UsefulLinksSection />);
    expect(screen.queryByRole("button", { name: /Useful links/i })).not.toBeInTheDocument();
  });

  it("renders curated useful links as external, safe anchors when expanded", async () => {
    const user = setupUser();
    render(<UsefulLinksSection links={[{ label: "Japan Rail Pass", url: "https://example.test/jr" }]} />);

    const toggle = screen.getByRole("button", { name: /Useful links/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    const link = screen.getByRole("link", { name: /Japan Rail Pass/i });
    expect(link).toHaveAttribute("href", "https://example.test/jr");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("PlanPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isEnabled.mockReturnValue(true);
  });

  it("renders duration, cost basis, warning, route, and fires itinerary/cinematic/pdf actions", async () => {
    const user = setupUser();
    const onCinematic = vi.fn();
    const onItinerary = vi.fn();
    const plan = makePlan({ warning: "Pack light for train transfers." });
    const country = makeCountry();

    render(
      <PlanPreview
        country={country}
        plan={plan}
        homeCountry="India"
        onCinematic={onCinematic}
        onItinerary={onItinerary}
        rule={makeRule()}
      />,
    );

    expect(screen.getByText(/5 days/)).toBeInTheDocument();
    expect(screen.getByText(/₹1L/)).toBeInTheDocument();
    expect(screen.getByLabelText("per couple")).toBeInTheDocument();
    expect(screen.getByText("Pack light for train transfers.")).toBeInTheDocument();
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByText("Kyoto")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Cinematic/i }));
    await user.click(screen.getByRole("button", { name: /Itinerary/i }));
    await user.click(screen.getByRole("button", { name: /Export PDF/i }));

    expect(onCinematic).toHaveBeenCalledWith(plan);
    expect(onItinerary).toHaveBeenCalledWith(plan);
    expect(mocks.exportItineraryAsPdf).toHaveBeenCalledWith(plan, country, "India");
  });

  it("marks AI plans and uses per-person cost label when no cost basis is stored", () => {
    render(
      <PlanPreview
        country={makeCountry()}
        plan={makePlan({ costBasis: undefined })}
        homeCountry="India"
        onCinematic={vi.fn()}
        onItinerary={vi.fn()}
        isAiPlan
        rule={makeRule()}
      />,
    );

    expect(screen.getByText(/✨ 5 days/)).toBeInTheDocument();
    expect(screen.getByLabelText("per person")).toBeInTheDocument();
  });

  it("disables cinematic when rule/city coverage is insufficient but keeps itinerary available", async () => {
    const user = setupUser();
    const onCinematic = vi.fn();
    const onItinerary = vi.fn();

    render(
      <PlanPreview
        country={makeCountry({ cities: [{ name: "Tokyo", lat: 0, lng: 0 }] })}
        plan={makePlan()}
        homeCountry="India"
        onCinematic={onCinematic}
        onItinerary={onItinerary}
        rule={makeRule()}
      />,
    );

    const cinematic = screen.getByRole("button", { name: /Cinematic/i });
    expect(cinematic).toBeDisabled();
    await user.click(cinematic);
    await user.click(screen.getByRole("button", { name: /Itinerary/i }));

    expect(onCinematic).not.toHaveBeenCalled();
    expect(onItinerary).toHaveBeenCalledTimes(1);
  });

  it("hides the PDF action when the feature flag is disabled", () => {
    mocks.isEnabled.mockReturnValue(false);

    render(
      <PlanPreview
        country={makeCountry()}
        plan={makePlan()}
        homeCountry="India"
        onCinematic={vi.fn()}
        onItinerary={vi.fn()}
        rule={makeRule()}
      />,
    );

    expect(screen.queryByRole("button", { name: /Export PDF/i })).not.toBeInTheDocument();
  });

  it("omits the route preview for a single-city plan", () => {
    render(
      <PlanPreview
        country={makeCountry()}
        plan={makePlan({ days: [{ label: "Day 1 — Tokyo", activities: ["Market"] }] })}
        homeCountry="India"
        onCinematic={vi.fn()}
        onItinerary={vi.fn()}
        rule={makeRule()}
      />,
    );

    expect(screen.getByText("not available")).toBeInTheDocument();
    expect(screen.queryByText("→")).not.toBeInTheDocument();
  });
});

describe("CityCard", () => {
  const city: CityEntry = {
    name: "Kyoto",
    lat: 35.0116,
    lng: 135.7681,
    bestMonths: ["March", "April", "May", "November"],
    notes: "Temples, gardens, and calm evening streets.",
  };

  it("renders a read-only city summary with notes and the first three month badges", () => {
    render(<CityCard city={city} />);

    expect(screen.getByText("Kyoto")).toBeInTheDocument();
    expect(screen.getByText("Temples, gardens, and calm evening streets.")).toBeInTheDocument();
    expect(screen.getByText("Mar")).toBeInTheDocument();
    expect(screen.getByText("Apr")).toBeInTheDocument();
    expect(screen.getByText("May")).toBeInTheDocument();
    expect(screen.queryByText("Nov")).not.toBeInTheDocument();
  });

  it("renders without optional notes or month badges", () => {
    const { container } = render(<CityCard city={{ name: "Osaka", lat: 34.6937, lng: 135.5023 }} />);

    expect(screen.getByText("Osaka")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("✓");
    expect(container).not.toHaveTextContent("Mar");
  });

  it("acts as a selectable pressed button and calls onToggle", async () => {
    const user = setupUser();
    const onToggle = vi.fn();

    render(<CityCard city={city} selectable selected onToggle={onToggle} />);

    const button = screen.getByRole("button", { name: /Kyoto/i });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("✓")).toBeInTheDocument();

    await user.click(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders an unselected selectable card with notes and month badges", () => {
    render(<CityCard city={city} selectable selected={false} onToggle={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Kyoto/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Temples, gardens, and calm evening streets.")).toBeInTheDocument();
    expect(screen.getByText("Mar")).toBeInTheDocument();
    expect(screen.getByText("Apr")).toBeInTheDocument();
    expect(screen.getByText("May")).toBeInTheDocument();
    expect(screen.queryByText("Nov")).not.toBeInTheDocument();
  });
});
