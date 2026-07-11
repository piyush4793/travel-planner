import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShareButton from "../../components/country/panel/ShareButton";
import type { Country } from "../../core/types";
import type { TripPlan } from "../../core/utils/tripPlans";

const { buildPdfMock, isEnabledMock } = vi.hoisted(() => ({
  buildPdfMock: vi.fn(() => new Blob(["%PDF-1.7"], { type: "application/pdf" })),
  isEnabledMock: vi.fn(),
}));

vi.mock("../../utils/pdfDocument", () => ({
  buildItineraryPdfBlob: buildPdfMock,
  itineraryPdfName: () => "India-itinerary.pdf",
}));
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

function setShare(share: unknown, canShare: unknown) {
  Object.defineProperty(navigator, "share", { value: share, configurable: true });
  Object.defineProperty(navigator, "canShare", { value: canShare, configurable: true });
}

let writeTextMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  isEnabledMock.mockReturnValue(true);
  writeTextMock = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText: writeTextMock }, configurable: true });
});

afterEach(() => {
  setShare(undefined, undefined);
});

describe("ShareButton — native PDF file share", () => {
  it("shares the itinerary PDF via the native sheet when file share is supported", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    setShare(shareMock, vi.fn().mockReturnValue(true));

    render(<ShareButton country={COUNTRY} homeCountry="India" plan={PLAN} />);
    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    expect(buildPdfMock).toHaveBeenCalledWith(PLAN, COUNTRY, "India", undefined);
    const arg = shareMock.mock.calls[0][0] as { files: File[]; text: string };
    expect(arg.files).toHaveLength(1);
    expect(arg.files[0].name).toBe("India-itinerary.pdf");
    expect(arg.files[0].type).toBe("application/pdf");
    expect(arg.text).toContain("Route: Delhi");
    expect(writeTextMock).not.toHaveBeenCalled();
  });

  it("does not fall back to clipboard when the user cancels the share sheet", async () => {
    const shareMock = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
    setShare(shareMock, vi.fn().mockReturnValue(true));

    render(<ShareButton country={COUNTRY} homeCountry="India" plan={PLAN} />);
    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => expect(shareMock).toHaveBeenCalled());
    expect(writeTextMock).not.toHaveBeenCalled();
  });

  it("falls back to native text share when files can't be shared", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    setShare(shareMock, vi.fn().mockReturnValue(false));

    render(<ShareButton country={COUNTRY} homeCountry="India" plan={PLAN} />);
    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    expect(buildPdfMock).toHaveBeenCalled();
    const arg = shareMock.mock.calls[0][0] as { text: string; files?: File[] };
    expect(arg.files).toBeUndefined();
    expect(arg.text).toContain("Route: Delhi");
  });
});

describe("ShareButton — desktop clipboard fallback", () => {
  it("copies the summary + app link when Web Share is unavailable", async () => {
    setShare(undefined, undefined);
    render(<ShareButton country={COUNTRY} homeCountry="India" plan={PLAN} />);

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    expect(await screen.findByText("Copied!")).toBeInTheDocument();
    expect(buildPdfMock).not.toHaveBeenCalled();
    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copied = writeTextMock.mock.calls[0][0] as string;
    expect(copied).toContain("Route: Delhi");
    expect(copied).toContain("Day 1 — Delhi: Old Delhi");
  });

  it("does not generate a PDF when no plan exists", async () => {
    setShare(undefined, undefined);
    render(<ShareButton country={COUNTRY} homeCountry="India" />);

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    expect(await screen.findByText("Copied!")).toBeInTheDocument();
    expect(buildPdfMock).not.toHaveBeenCalled();
    expect(writeTextMock).toHaveBeenCalledTimes(1);
  });

  it("does not generate a PDF when the pdfExport flag is disabled", async () => {
    isEnabledMock.mockReturnValue(false);
    setShare(vi.fn().mockResolvedValue(undefined), vi.fn().mockReturnValue(true));

    render(<ShareButton country={COUNTRY} homeCountry="India" plan={PLAN} />);
    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    expect(buildPdfMock).not.toHaveBeenCalled();
  });
});
