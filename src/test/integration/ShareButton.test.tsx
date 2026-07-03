import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShareButton from "../../components/country/panel/ShareButton";
import type { Country } from "../../core/types";
import type { TripPlan } from "../../core/utils/tripPlans";

const { exportPdfMock, isEnabledMock } = vi.hoisted(() => ({
  exportPdfMock: vi.fn(),
  isEnabledMock: vi.fn(),
}));

vi.mock("../../utils/pdfExport", () => ({ exportItineraryAsPdf: exportPdfMock }));
vi.mock("../../core/featureFlags", () => ({ isEnabled: isEnabledMock }));

const COUNTRY: Country = {
  name: "India",
  lat: 20.59,
  lng: 78.96,
  bestMonths: ["October"],
  budget: "₹1L–₹2L",
  experiences: ["Temples"],
  cities: [{ name: "Delhi", lat: 28.6, lng: 77.2 }],
};

const PLAN: TripPlan = {
  duration: "3 days",
  costPerPerson: "₹36K – ₹63K",
  days: [{ label: "Day 1 — Delhi", theme: "Old Delhi", activities: ["Red Fort"] }],
  note: "note",
};

let writeTextMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  isEnabledMock.mockReturnValue(true);
  writeTextMock = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: writeTextMock },
    configurable: true,
  });
  // Ensure clipboard path (not Web Share) is exercised
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
});

describe("ShareButton", () => {
  it("copies the itinerary summary and triggers PDF export when a plan exists", async () => {
    render(<ShareButton country={COUNTRY} homeCountry="India" plan={PLAN} />);

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    expect(await screen.findByText("Copied!")).toBeInTheDocument();
    expect(exportPdfMock).toHaveBeenCalledWith(PLAN, COUNTRY, "India");
    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copied = writeTextMock.mock.calls[0][0] as string;
    expect(copied).toContain("Route: Delhi");
    expect(copied).toContain("Day 1 — Delhi: Old Delhi");
  });

  it("does not trigger PDF export when no plan is available", async () => {
    render(<ShareButton country={COUNTRY} homeCountry="India" />);

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    expect(await screen.findByText("Copied!")).toBeInTheDocument();
    expect(exportPdfMock).not.toHaveBeenCalled();
    expect(writeTextMock).toHaveBeenCalledTimes(1);
  });

  it("does not trigger PDF export when the pdfExport flag is disabled", async () => {
    isEnabledMock.mockReturnValue(false);
    render(<ShareButton country={COUNTRY} homeCountry="India" plan={PLAN} />);

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    expect(await screen.findByText("Copied!")).toBeInTheDocument();
    expect(exportPdfMock).not.toHaveBeenCalled();
    expect(writeTextMock).toHaveBeenCalledTimes(1);
  });
});
