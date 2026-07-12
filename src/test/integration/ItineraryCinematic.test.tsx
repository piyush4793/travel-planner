import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ItineraryCinematic from "../../components/country/ItineraryCinematic";
import { cleanJumpOptions, buildSingleCountryRoute } from "../../components/country/cinematic/engine";
import type { TripPlan } from "../../core/utils/tripPlans";
import type { Country } from "../../core/types";

vi.mock("maplibre-gl", () => ({
  default: { Map: vi.fn(), Marker: vi.fn() },
  Map: vi.fn(),
  Marker: vi.fn(),
}));

// useBreakpoint → desktop; reduced-motion → false so the animated (control) path renders
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === "(min-width: 1024px)" || query === "(min-width: 768px)",
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const plan: TripPlan = {
  duration: "5 days",
  costPerPerson: "₹1L",
  note: "Great trip",
  days: [
    { label: "Day 1 — Oslo", activities: ["Vigeland Park"] },
    { label: "Day 2 — Bergen", activities: ["Bryggen Wharf"] },
  ],
};

const country: Country = {
  name: "Norway",
  lat: 60.47,
  lng: 10.75,
  bestMonths: ["June"],
  budget: "₹1L",
  experiences: ["Fjords"],
};

function renderCinematic() {
  // No mainMapRef → map unavailable, but the header/footer controls still render.
  const route = buildSingleCountryRoute(plan, country, null, "India");
  return render(<ItineraryCinematic route={route} onClose={vi.fn()} />);
}

describe("ItineraryCinematic controls", () => {
  afterEach(() => cleanup());

  it("renders skip and speed controls", () => {
    renderCinematic();
    expect(screen.getAllByLabelText("Skip to next stop").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Back to previous stop").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/Playback speed/).length).toBeGreaterThan(0);
  });

  it("previous-stop button is disabled before any stop is reached", () => {
    renderCinematic();
    // No map ref → animation never advances, so we're before the first stop.
    for (const btn of screen.getAllByLabelText("Back to previous stop")) {
      expect(btn).toBeDisabled();
    }
  });

  it("cycles playback speed 1× → 1.5× → 2× → 1×", async () => {
    const user = userEvent.setup();
    renderCinematic();
    const speedBtn = screen.getAllByLabelText(/Playback speed/)[0];

    expect(speedBtn).toHaveTextContent("1×");
    await user.click(speedBtn);
    expect(screen.getAllByLabelText(/Playback speed/)[0]).toHaveTextContent("1.5×");
    await user.click(screen.getAllByLabelText(/Playback speed/)[0]);
    expect(screen.getAllByLabelText(/Playback speed/)[0]).toHaveTextContent("2×");
    await user.click(screen.getAllByLabelText(/Playback speed/)[0]);
    expect(screen.getAllByLabelText(/Playback speed/)[0]).toHaveTextContent("1×");
  });

  it("skip button is clickable without throwing", async () => {
    const user = userEvent.setup();
    renderCinematic();
    const skipBtn = screen.getAllByLabelText("Skip to next stop")[0];
    await expect(user.click(skipBtn)).resolves.not.toThrow();
  });

  it("rapid multi-clicks on speed stay deterministic", async () => {
    const user = userEvent.setup();
    renderCinematic();
    const btn = () => screen.getAllByLabelText(/Playback speed/)[0];
    // 4 clicks from 1× → 1.5× → 2× → 1× → 1.5×
    await user.click(btn());
    await user.click(btn());
    await user.click(btn());
    await user.click(btn());
    expect(btn()).toHaveTextContent("1.5×");
  });

  it("rapid multi-clicks on skip do not throw", async () => {
    const user = userEvent.setup();
    renderCinematic();
    const skip = () => screen.getAllByLabelText("Skip to next stop")[0];
    await user.click(skip());
    await user.click(skip());
    await expect(user.click(skip())).resolves.not.toThrow();
  });
});

describe("cleanJumpOptions", () => {
  it("omits undefined bearing/pitch so jumpTo never receives NaN", () => {
    // Overview segment: only center + zoom → bearing/pitch must be absent.
    const out = cleanJumpOptions({ center: [10, 20], zoom: 1.8, duration: 1800 });
    expect(out).toEqual({ center: [10, 20], zoom: 1.8 });
    expect("bearing" in out).toBe(false);
    expect("pitch" in out).toBe(false);
  });

  it("keeps defined bearing/pitch and drops non-camera keys", () => {
    const out = cleanJumpOptions({ center: [1, 2], zoom: 9, bearing: 0, pitch: 40, duration: 1000 });
    expect(out).toEqual({ center: [1, 2], zoom: 9, bearing: 0, pitch: 40 });
    expect("duration" in out).toBe(false);
  });
});
