import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CountryPanel from "../../components/country/CountryPanel";
import type { Country } from "../../core/types";
import type { TripPlan } from "../../core/utils/tripPlans";
import type { SavedAiPlan } from "../../hooks/useAiPlanStore";

const mockRuleData = vi.hoisted(() => {
  const rule = {
    sim: "Japan eSIM",
    apps: ["Suica", "Google Maps"],
    cityOrder: ["Tokyo", "Kyoto"],
    cities: {
      Tokyo: {
        name: "Tokyo",
        minDays: 1,
        recDays: 2,
        maxDays: 3,
        days: [
          { theme: "Arrival", activities: [{ name: "Shibuya crossing", cost: "₹2K" }], hotels: [{ name: "Tokyo Stay", budget: "₹12K" }] },
          { theme: "Culture", activities: [{ name: "Meiji Shrine" }] },
          { theme: "Food", activities: [{ name: "Tsukiji food walk" }] },
        ],
      },
      Kyoto: {
        name: "Kyoto",
        minDays: 1,
        recDays: 1,
        maxDays: 2,
        days: [
          { theme: "Temples", activities: [{ name: "Fushimi Inari" }] },
          { theme: "Arashiyama", activities: [{ name: "Bamboo grove" }] },
        ],
      },
    },
    connections: [{ from: "Tokyo", to: "Kyoto", method: "Shinkansen", cost: "₹8K" }],
    extras: ["Carry cash"],
  };

  return {
    rule,
    data: {
      name: "Japan",
      seed: true,
      lat: 35.6762,
      lng: 139.6503,
      region: "Asia",
      bestMonths: ["March", "April"],
      worstMonths: ["August"],
      budget: { solo: "₹90K", couple: "₹1.6L", family4: "₹3.1L" },
      experiences: ["Food", "Culture", "Temples"],
      avoid: ["Golden Week crowds"],
      combo: ["South Korea"],
      landmark: "Mount Fuji",
      travelStyle: ["explorer"],
      stopoverNote: "Use Tokyo as an easy stopover.",
      links: [{ label: "Japan Guide", url: "https://example.com/japan" }],
      cities: [
        { name: "Tokyo", lat: 35.6762, lng: 139.6503, bestMonths: ["March"], notes: "Food, neon, museums" },
        { name: "Kyoto", lat: 35.0116, lng: 135.7681, bestMonths: ["April"], notes: "Temples, gardens" },
      ],
      itinerary: rule,
    },
  };
});

vi.mock("../../hooks/useBreakpoint", () => ({
  useBreakpoint: () => "desktop",
}));

vi.mock("../../hooks/usePanelDrag", () => ({
  usePanelDrag: () => ({
    panelWidth: 360,
    startPanelDrag: vi.fn(),
  }),
}));

vi.mock("../../hooks/useCountryRule", () => ({
  useCountryRule: () => ({
    data: mockRuleData.data,
    rule: mockRuleData.rule,
    loading: false,
  }),
}));

vi.mock("../../components/country/ItineraryCinematic", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Cinematic itinerary">
      <button onClick={onClose}>Close cinematic</button>
    </div>
  ),
}));

vi.mock("../../components/country/ItineraryModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Itinerary details">
      <button onClick={onClose}>Close itinerary</button>
    </div>
  ),
}));

vi.mock("../../components/country/PlanCompareModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Compare Plans">
      <p>Side-by-Side Comparison</p>
      <button onClick={onClose}>Close compare</button>
    </div>
  ),
}));

function makeCountry(overrides: Partial<Country> = {}): Country {
  return {
    name: "Japan",
    lat: 35.6762,
    lng: 139.6503,
    bestMonths: ["March", "April"],
    worstMonths: ["August"],
    budget: "₹2L",
    budgetBreakdown: { solo: "₹1.1L", couple: "₹2.2L", family4: "₹4.4L" },
    experiences: ["Food", "Culture", "Temples"],
    avoid: ["Golden Week crowds"],
    combo: ["South Korea"],
    landmark: "Mount Fuji",
    travelStyle: ["explorer"],
    stopoverNote: "Use Tokyo as an easy stopover.",
    links: [{ label: "Japan Guide", url: "https://example.com/japan" }],
    cities: [
      { name: "Tokyo", lat: 35.6762, lng: 139.6503, bestMonths: ["March"], notes: "Food, neon, museums" },
      { name: "Kyoto", lat: 35.0116, lng: 135.7681, bestMonths: ["April"], notes: "Temples, gardens" },
    ],
    ...overrides,
  };
}

function makePlan(overrides: Partial<TripPlan> = {}): TripPlan {
  return {
    duration: "2 days",
    costPerPerson: "₹1.8L",
    note: "AI route",
    days: [
      { label: "Day 1 — Tokyo", activities: ["Shibuya", "Ramen"] },
      { label: "Day 2 — Kyoto", activities: ["Fushimi Inari"] },
    ],
    ...overrides,
  };
}

function makeAiPlan(overrides: Partial<SavedAiPlan> = {}): SavedAiPlan {
  return {
    id: "ai-1",
    schemaVersion: 1,
    savedAt: "2026-01-01T00:00:00.000Z",
    destinationKey: "japan",
    destinationName: "Japan",
    result: {
      destinationName: "Japan",
      originCountry: "India",
      travelers: 2,
      durationDays: 2,
      budgetLevel: "mid-range",
      assumptions: [],
      cities: [],
      meta: {
        bestMonths: [],
        worstMonths: [],
        thingsToAvoid: [],
        comboCountries: [],
        highlights: [],
      },
      plan: makePlan(),
    },
    ...overrides,
  };
}

type PanelProps = React.ComponentProps<typeof CountryPanel>;

function renderPanel(overrides: Partial<PanelProps> = {}) {
  const southKorea = makeCountry({ name: "South Korea", lat: 37.5665, lng: 126.978, experiences: ["Food"] });
  const props: PanelProps = {
    country: makeCountry(),
    onClose: vi.fn(),
    onSelectCountry: vi.fn(),
    isFavorite: false,
    onToggleFavorite: vi.fn(),
    isVisited: false,
    onToggleVisited: vi.fn(),
    onFilterExperience: vi.fn(),
    activeExperiences: [],
    onEdit: vi.fn(),
    onUpdateNotes: vi.fn(),
    homeCountry: "India",
    budgetBasis: "family4",
    allCountries: [makeCountry(), southKorea],
    ...overrides,
  };

  return { ...render(<CountryPanel {...props} />), props };
}

describe("CountryPanel more coverage", () => {
  it("switches between overview, plan, info, and notes tabs", async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByRole("button", { name: /Trip readiness/i })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Plan/i }));
    expect(screen.getByText(/Trip length/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommended/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Info/i }));
    expect(screen.getByRole("button", { name: /Learn about Japan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Useful links/i })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Notes/i }));
    expect(screen.getByPlaceholderText(/Jot down ideas/i)).toBeInTheDocument();
  });

  it("updates the day slider and renders the offline plan preview for the selected duration", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("tab", { name: /Plan/i }));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "5" } });

    await waitFor(() => expect(screen.getByText("5d")).toBeInTheDocument());
    expect(screen.getByText("📅 5 days")).toBeInTheDocument();
    expect(screen.getAllByText("Tokyo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kyoto").length).toBeGreaterThan(0);
    expect(screen.getAllByTitle(/per family of 4/i).length).toBeGreaterThan(0);
  });

  it("switches from the default plan to a saved AI plan and opens comparison", async () => {
    const user = userEvent.setup();
    renderPanel({ aiPlans: [makeAiPlan()] });

    await user.click(screen.getByRole("tab", { name: /Plan/i }));
    await user.selectOptions(screen.getByRole("combobox"), "ai-1");

    expect(screen.getAllByText("✨ AI 1 · 2d").length).toBeGreaterThan(0);
    expect(screen.getByText(/2 days · ₹1.8L/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Compare/i }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: /Compare Plans/i })).toBeInTheDocument());
    expect(screen.getByText(/Side-by-Side Comparison/i)).toBeInTheDocument();
  });

  it("confirms deletion of a saved AI plan", async () => {
    const user = userEvent.setup();
    const onDeleteAiPlan = vi.fn();
    renderPanel({ aiPlans: [makeAiPlan()], onDeleteAiPlan });

    await user.click(screen.getByRole("tab", { name: /Plan/i }));
    await user.selectOptions(screen.getByRole("combobox"), "ai-1");
    await user.click(screen.getByRole("button", { name: /Delete/i }));
    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    expect(onDeleteAiPlan).toHaveBeenCalledWith("ai-1");
  });

  it("launches cinematic mode and reports the active state", async () => {
    const user = userEvent.setup();
    const onCinematicChange = vi.fn();
    renderPanel({ onCinematicChange });

    await user.click(screen.getByRole("tab", { name: /Plan/i }));
    await user.click(screen.getByRole("button", { name: /Cinematic/i }));

    await waitFor(() => expect(onCinematicChange).toHaveBeenCalledWith(true));
    expect(screen.getByRole("dialog", { name: /Cinematic itinerary/i })).toBeInTheDocument();
  });

  it("prefers edited budget breakdown badges and marks the active budget basis icon", () => {
    renderPanel({ budgetBasis: "family4" });

    expect(screen.getByText("₹1.1L")).toBeInTheDocument();
    expect(screen.getByText("₹2.2L")).toBeInTheDocument();
    expect(screen.getByText("₹4.4L")).toBeInTheDocument();
    expect(screen.queryByText("₹90K")).not.toBeInTheDocument();
    expect(screen.getByTitle(/per family of 4/i)).toHaveTextContent("👨‍👩‍👧‍👦₹4.4L");
  });

  it("fires header action callbacks", async () => {
    const user = userEvent.setup();
    const onToggleVisited = vi.fn();
    const onToggleFavorite = vi.fn();
    const onEdit = vi.fn();
    const onClose = vi.fn();
    renderPanel({ onToggleVisited, onToggleFavorite, onEdit, onClose });

    await user.click(screen.getByRole("button", { name: /Visited/i }));
    await user.click(screen.getByRole("button", { name: /Favorite/i }));
    await user.click(screen.getByRole("button", { name: /Edit/i }));
    await user.click(screen.getByRole("button", { name: /Close panel/i }));

    expect(onToggleVisited).toHaveBeenCalledTimes(1);
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("expands and collapses overview and info sections", async () => {
    const user = userEvent.setup();
    renderPanel();

    const sections = [
      screen.getByRole("button", { name: /Trip readiness/i }),
      screen.getByRole("button", { name: /When to go/i }),
      screen.getByRole("button", { name: /Experiences/i }),
      screen.getByRole("button", { name: /Cities/i }),
      screen.getByRole("button", { name: /Combine with/i }),
    ];

    for (const section of sections) {
      expect(section).toHaveAttribute("aria-expanded", "false");
      await user.click(section);
      expect(section).toHaveAttribute("aria-expanded", "true");
      await user.click(section);
      expect(section).toHaveAttribute("aria-expanded", "false");
    }

    expect(screen.getByText(/Stopover tip/i)).toBeInTheDocument();
    expect(screen.getByText(/Watch out for/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Info/i }));
    const links = screen.getByRole("button", { name: /Useful links/i });
    expect(links).toHaveAttribute("aria-expanded", "false");
    await user.click(links);
    expect(links).toHaveAttribute("aria-expanded", "true");
  });

  it("filters by clicked experience tags", async () => {
    const user = userEvent.setup();
    const onFilterExperience = vi.fn();
    renderPanel({ onFilterExperience, activeExperiences: ["Food"] });

    await user.click(screen.getByRole("button", { name: /Experiences/i }));
    await user.click(screen.getByRole("button", { name: "Food" }));

    expect(onFilterExperience).toHaveBeenCalledWith("Food");
  });
});
