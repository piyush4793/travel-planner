import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
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
  it("switches between overview, plan, and notes tabs", async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByRole("button", { name: /Trip readiness/i })).toBeInTheDocument();
    // Info sections are merged into Overview (no separate Info tab).
    expect(screen.getByRole("button", { name: /Learn about Japan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Useful links/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Info/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Plan/i }));
    expect(screen.getByText(/Trip length/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommended/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Notes/i }));
    expect(screen.getByPlaceholderText(/Jot down ideas/i)).toBeInTheDocument();
  });

  it("keeps cities only in the Plan tab, not in Overview", async () => {
    const user = userEvent.setup();
    renderPanel();

    // Overview no longer lists a read-only Cities section.
    expect(screen.queryByRole("button", { name: /^Cities$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Plan/i }));
    expect(screen.getByRole("button", { name: /Cities to visit/i })).toBeInTheDocument();
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

  it("pins a manually dragged day count so later focus changes don't re-seed it", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("tab", { name: /Plan/i }));
    // Drag the slider to 5 days — this pins the value.
    fireEvent.change(screen.getByRole("slider"), { target: { value: "5" } });
    await waitFor(() => expect(screen.getByText("5d")).toBeInTheDocument());

    // Toggling a focus experience would otherwise re-suggest a shorter length,
    // but the pinned value must survive.
    await user.click(screen.getByRole("button", { name: /Focus experiences/i }));
    await user.click(screen.getByRole("button", { name: "Food" }));

    // The pinned slider value survives the focus change (the plan itself may be
    // shorter if the focused cities can't fill the requested length).
    expect(screen.getByText("5d")).toBeInTheDocument();

    // The pin is legible and recoverable: tapping "Reset to recommended" re-links
    // the day count to the current focus/style selection.
    await user.click(screen.getByRole("button", { name: /Reset trip length to the recommended/i }));
    await waitFor(() => expect(screen.queryByText("5d")).not.toBeInTheDocument());
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

    // "Useful links" now lives in Overview (Info tab merged in).
    const links = screen.getByRole("button", { name: /Useful links/i });
    expect(links).toHaveAttribute("aria-expanded", "false");
    await user.click(links);
    expect(links).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles panel-local focus experiences in the Plan tab without any global callback", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("tab", { name: /Plan/i }));
    await user.click(screen.getByRole("button", { name: /Focus experiences/i }));

    const foodChip = screen.getByRole("button", { name: "Food" });
    expect(foodChip).toHaveAttribute("aria-pressed", "false");

    await user.click(foodChip);
    expect(screen.getByRole("button", { name: "Food" })).toHaveAttribute("aria-pressed", "true");

    const clearBtn = screen.getByRole("button", { name: /Clear focus \(1\)/i });
    await user.click(clearBtn);
    expect(screen.getByRole("button", { name: "Food" })).toHaveAttribute("aria-pressed", "false");
  });

  it("selects and clears cities in the Plan tab", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("tab", { name: /Plan/i }));
    await user.click(screen.getByRole("button", { name: /Cities to visit/i }));

    await user.click(screen.getByRole("button", { name: /Tokyo/i }));
    expect(screen.getByRole("button", { name: /Tokyo/i })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /Kyoto/i }));
    const clearBtn = screen.getByRole("button", { name: /Clear selection \(2\)/i });
    expect(clearBtn).toBeInTheDocument();

    await user.click(clearBtn);
    expect(screen.queryByRole("button", { name: /Clear selection/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tokyo/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("triggers Plan with AI from the plan tab", async () => {
    const user = userEvent.setup();
    const onPlanWithAi = vi.fn();
    renderPanel({ onPlanWithAi });

    await user.click(screen.getByRole("tab", { name: /Plan/i }));
    await user.click(screen.getByRole("button", { name: /Plan with AI/i }));

    expect(onPlanWithAi).toHaveBeenCalledWith("Japan");
  });

  it("expands notes into a modal and closes it", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("tab", { name: /Notes/i }));
    await user.click(screen.getByRole("button", { name: /Expand notes/i }));

    const dialog = screen.getByRole("dialog", { name: /Expanded notes for Japan/i });
    expect(dialog).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: /Expanded notes for Japan/i })).not.toBeInTheDocument();
  });

  it("auto-saves notes after the debounce window and shows the saved indicator", () => {
    vi.useFakeTimers();
    try {
      const onUpdateNotes = vi.fn();
      renderPanel({ onUpdateNotes });

      fireEvent.click(screen.getByRole("tab", { name: /Notes/i }));
      const textarea = screen.getByPlaceholderText(/Jot down ideas/i);
      fireEvent.change(textarea, { target: { value: "Pack an umbrella" } });

      // Debounced save has not fired yet.
      expect(onUpdateNotes).not.toHaveBeenCalled();

      act(() => { vi.advanceTimersByTime(300); });
      expect(onUpdateNotes).toHaveBeenCalledWith("Pack an umbrella");
      expect(screen.getByText(/✓ Saved/)).toHaveClass("opacity-100");

      // Saved indicator fades after 2s.
      act(() => { vi.advanceTimersByTime(2000); });
      expect(screen.getByText(/✓ Saved/)).toHaveClass("opacity-0");
    } finally {
      vi.useRealTimers();
    }
  });
});
